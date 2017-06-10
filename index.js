const arguguard = require('arguguard')
const BytesLengthError = require('./errors/BytesLengthError')


function padLeft(array, length) {
  if (array.length === length) {
    return array
  }
  if (array.length > length) {
    throw new Error('Array greater than length')
  }
  return Array(length - array.length).fill(0).concat(array)
}

exports.marshalRecord = function marshalRecord(timestamp, sender, gigawei, documentLength, documentHash, previousRecordHash) {
  arguguard('marshalRecord', ['Amorph', 'Amorph', 'Amorph', 'Amorph', 'Amorph', 'Amorph'], arguments)

  var expectedLengths = [4, 20, 4, 4, 32, 32]
  var array = []

  expectedLengths.forEach((expectedLength, index) => {
    const _array = arguments[index].to('array')
    if (_array.length !== expectedLength) {
      throw new BytesLengthError(`Argument #${index} should be ${expectedLength} bytes, receieved ${_array.length}`)
    }
    array.push(..._array)
  })

  const Amorph = timestamp.constructor
  return new Amorph(array, 'array')
}

exports.unmarshalRecord = function unmarshalRecord(marshalledRecord) {
  arguguard('unmarshalRecord', ['Amorph'], arguments)
  const marshalledRecordLength = marshalledRecord.to('array').length
  if (marshalledRecordLength !== 96) {
    throw new BytesLengthError(`Record should be 96 bytes, received ${marshalledRecordLength }`)
  }
  const record = {
    timestamp: marshalledRecord.as('array', (array) => {
      return array.slice(0, 4)
    }),
    sender: marshalledRecord.as('array', (array) => {
      return array.slice(4, 24)
    }),
    gigawei: marshalledRecord.as('array', (array) => {
      return array.slice(24, 28)
    }),
    documentLength: marshalledRecord.as('array', (array) => {
      return array.slice(28, 32)
    }),
    documentHash: marshalledRecord.as('array', (array) => {
      return array.slice(32, 64)
    }),
    previousRecordHash: marshalledRecord.as('array', (array) => {
      return array.slice(64, 96)
    })
  }
  return record
}

function isAllZeros(amorph) {
  return amorph.to('array').reduce((a, b) => {
    return a + b
  }, 0) === 0
}

exports.downloadRecords = function downloadRecords(recordHash, getter, setter) {
  arguguard('download', ['Amorph', 'function', 'function'], arguments)
  return getter(recordHash).then((record) => {
    const unmarhalledRecord = exports.unmarshalRecord(record)
    return setter(recordHash, unmarhalledRecord).then(() => {
      const previousRecordHash = unmarhalledRecord.previousRecordHash
      if (isAllZeros(previousRecordHash)) {
        return
      } else {
        return exports.downloadRecords(previousRecordHash, getter, setter)
      }
    })
  })
}
