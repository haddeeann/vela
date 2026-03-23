const { extractDateTime } = require('./dateTimeExtractor')

const tests = [
  'today',
  'tomorrow',
  'next Monday',
  'at 2pm',
  'at 2',
  '7am',
  '10:30pm to 6:30am',
  'every day',
  'weekdays',
  'weekends',
  'every Monday',
  'every Monday and Wednesday',
  'every week',
  'every month',
  'Gym tomorrow at 6:30pm daily',
  'Meeting on Thursday at 10',
  'Unknown input'
]

console.log('Current Date:', new Date().toISOString().split('T')[0])
console.log('----------------------------------------')

tests.forEach(input => {
  console.log('Input: ' + input) 
  console.log(JSON.stringify(extractDateTime(input), null, 2))
  console.log('----------------------------------------')
})
