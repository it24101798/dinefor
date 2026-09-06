# DineFor Release 4.4 — Zero-Friction Availability, Inventory & Reservation Engine

## Business objective
Hotels should not need a staff member watching DineFor all day. A hotel defines normal buffet capacity/schedule once; DineFor automatically sells inside those rules. Hotels intervene only for exceptions.

## Reservation automation
Each buffet now supports:
- `auto_confirm` (default)
- `manual_request` (optional fallback)
- maximum guests per online booking
- advance-booking requirement
- booking-window days

`auto_confirm` is the DineFor default because the marketplace should create incremental reservations without adding routine hotel confirmation work.

## Availability calendar
New public endpoint:
`GET /api/bookings/availability/:buffetId/calendar?from=YYYY-MM-DD&days=14&guests=2`

It returns:
- valid dates
- total available seats
- slot-level availability
- ability to fit the requested party
- instant-confirmation policy

## Hotel inventory exceptions
Hotels normally do not edit daily capacity.

When an exception happens they can:
- close one date/time slot
- temporarily revise capacity
- add an operational reason
- restore that date/slot back to the buffet default

Endpoints:
- `GET /api/bookings/inventory/:buffetId`
- `PUT /api/bookings/inventory/:buffetId/:dateKey/:slotId`
- `DELETE /api/bookings/inventory/:buffetId/:dateKey/:slotId`

These routes require the owning hotel or admin.

## Overselling protection
Booking seat allocation remains an atomic MongoDB `findOneAndUpdate` operation and now also refuses closed inventory records.

## Customer self-service
Existing booking modification and calendar export code is now exposed through routes:
- `PUT /api/bookings/my-bookings/:id/modify`
- `GET /api/bookings/my-bookings/:id/calendar`

This reduces routine hotel/customer-support workload.

## Customer UX
Buffet Details now includes a compact 14-day availability strip and clearly communicates instant confirmation where supported.

## Payment boundary
No payment gateway is added in 4.4. Release 4.5 will build payment/deposit/refund handling on top of this inventory/booking foundation.
