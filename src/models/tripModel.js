const pool = require('../db/pool');

async function searchTrips({ departureCity, destinationCity, date, tripType }) {
  const params = [departureCity, destinationCity, date];
  let sql = 'SELECT id, agency_name as "agencyName", departure_city as "departureCity", destination_city as "destinationCity", departure_date as "departureDate", departure_time as "departureTime", duration_minutes as "durationMinutes", price_adult as "priceAdult", price_child as "priceChild", available_seats as "availableSeats", trip_type as "tripType" FROM trips WHERE departure_city = $1 AND destination_city = $2 AND departure_date = $3';
  if (tripType) {
    params.push(tripType);
    sql += ' AND trip_type = $4';
  }
  const { rows } = await pool.query(sql, params);
  return rows;
}

module.exports = { searchTrips };