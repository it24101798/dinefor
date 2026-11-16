const payhere = require("./payhereGateway");

const gateways = { payhere };

const getGateway = (name) => {
  const gateway = gateways[name];
  if (!gateway) {
    const error = new Error(`Unsupported payment gateway: ${name}`);
    error.code = "UNSUPPORTED_GATEWAY";
    throw error;
  }
  return gateway;
};

module.exports = { getGateway, supportedGateways: Object.keys(gateways) };
