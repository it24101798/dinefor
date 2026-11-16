const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateTotals, calculatePaymentBreakdown, getCommissionRate } = require('../utils/pricing');
const { calculateSettlement } = require('../utils/settlementMath');

const tx = (type, amount, extra = {}) => ({ type, amount,
  direction: type === 'refund' ? 'debit' : 'credit',
  payment: { _id: 'p1', commissionRate: 5, gateway: 'payhere', gatewayFee: 132 }, ...extra });
const check = (transactions, amount, direction, commission) => {
  const result = calculateSettlement(transactions);
  assert.equal(result.netAmount, amount);
  assert.equal(result.direction, direction);
  assert.equal(result.commissionDue, commission);
  return result;
};

test('default commission is 5%; invalid rates fall back; valid historical configuration remains supported', () => {
  const old = process.env.DINEFOR_COMMISSION_RATE;
  try {
    delete process.env.DINEFOR_COMMISSION_RATE;
    assert.equal(getCommissionRate(), 5);
    for (const value of ['invalid', '-1', '101']) {
      process.env.DINEFOR_COMMISSION_RATE = value;
      assert.equal(getCommissionRate(), 5);
    }
    process.env.DINEFOR_COMMISSION_RATE = '0'; assert.equal(getCommissionRate(), 0);
    process.env.DINEFOR_COMMISSION_RATE = '8'; assert.equal(getCommissionRate(), 8);
  } finally { if (old === undefined) delete process.env.DINEFOR_COMMISSION_RATE; else process.env.DINEFOR_COMMISSION_RATE = old; }
});
test('4000 customer total: 3800 hotel, 200 gross commission; fee is not added to customer total', () => {
  const names = ['DINEFOR_COMMISSION_RATE', 'DINEFOR_TAX_RATE', 'DINEFOR_SERVICE_CHARGE_RATE', 'PAYHERE_GATEWAY_FEE_RATE'];
  const old = names.map(name => process.env[name]);
  try {
    Object.assign(process.env, {DINEFOR_COMMISSION_RATE:'5', DINEFOR_TAX_RATE:'0', DINEFOR_SERVICE_CHARGE_RATE:'0', PAYHERE_GATEWAY_FEE_RATE:'3.3'});
    const totals = calculateTotals({price:4000, seats:1});
    assert.equal(totals.grandTotal,4000); assert.equal(totals.hotelEarning,3800);
    for (const [paymentMode, due, fee] of [['full_payment',4000,132],['deposit',800,26.4],['pay_at_hotel',0,0]]) {
      const p = calculatePaymentBreakdown({totals,paymentMode,gateway:'payhere',depositRate:20});
      assert.equal(p.customerTotal,4000); assert.equal(p.hotelPayable,3800); assert.equal(p.dineForCommission,200);
      assert.equal(p.amountDueNow,due); assert.equal(p.amountDueAtHotel,4000-due); assert.equal(p.gatewayFee,fee);
    }
  } finally { names.forEach((name,i) => { if(old[i]===undefined) delete process.env[name]; else process.env[name]=old[i]; }); }
});
test('full online collection pays hotel 95% regardless of gateway cost', () => {
  const r=check([tx('payment',4000)],3800,'payable_to_hotel',200); assert.equal(r.gatewayFees,132);
});
test('hotel collection owes DineFor 5%', () => check([tx('manual_collection',4000)],200,'receivable_from_hotel',200));
test('deposit plus hotel balance yields 3800 total retained by hotel', () => check([tx('payment',800,{metadata:{gatewayFee:26.4}}),tx('manual_collection',3200)],600,'payable_to_hotel',200));
test('partial online refund reverses proportional commission', () => check([tx('payment',4000),tx('refund',1000)],2850,'payable_to_hotel',150));
test('full refund in same batch balances without charging hotel gateway fees', () => check([tx('payment',4000),tx('refund',4000)],0,'balanced',0));
test('later-period online refund recovers only the hotel share', () => check([tx('refund',4000)],3800,'receivable_from_hotel',-200));
test('later-period hotel refund returns previously collected commission', () => check([tx('refund',1000,{metadata:{source:'manual'}})],50,'payable_to_hotel',-50));
test('legacy 8% payment snapshot is preserved', () => check([tx('payment',4000,{payment:{_id:'old',commissionRate:8,gatewayFee:132}})],3680,'payable_to_hotel',320));
test('money rounds to cents', () => check([tx('payment',100.01)],95.01,'payable_to_hotel',5));
test('empty period is balanced', () => check([],0,'balanced',0));
