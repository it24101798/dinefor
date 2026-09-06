# Release 4.4 QA

## Public availability
- [ ] `/api/bookings/availability/<BUFFET_ID>?date=YYYY-MM-DD`
- [ ] `/api/bookings/availability/<BUFFET_ID>/calendar?days=14&guests=2`
- [ ] Invalid/closed dates return unavailable cleanly.
- [ ] Sold-out slots show 0 available seats.
- [ ] Party size larger than available capacity is not bookable.

## Automatic confirmation
- [ ] Buffet with default `auto_confirm` creates a confirmed reservation.
- [ ] Customer receives confirmation without hotel action.
- [ ] Buffet using `manual_request` creates pending status.

## Concurrency
- [ ] Two customers cannot consume the same final seat.
- [ ] Closed inventory cannot be booked.
- [ ] Cancellation restores seats but never above total capacity.

## Hotel exception management
- [ ] Hotel can view only its own buffet inventory.
- [ ] Hotel can close one date/slot.
- [ ] Hotel can adjust capacity without going below already reserved guests.
- [ ] Hotel can reset an exception to default capacity.
- [ ] Another hotel receives 403.

## Customer self-service
- [ ] Customer can modify an eligible unpaid booking.
- [ ] Customer cannot modify checked-in/completed booking.
- [ ] Calendar download works.
- [ ] Cancellation restores capacity.

## Frontend
- [ ] Buffet Details displays 14-day availability strip.
- [ ] Selecting a quick date refreshes slots.
- [ ] Guest count respects hotel max booking size.
- [ ] Instant-confirmation message appears when appropriate.
- [ ] Existing desktop layout remains intact.
- [ ] Mobile layout remains usable at 360/390/430px.
