const Amorph = require('amorph')
const arguguard = require('arguguard')
const BytesLengthError = require('./errors/BytesLengthError')
const amorphBufferPlugin = require('amorph-buffer')
const ipfsUtils = require('ipfs-amorph-utils')

Amorph.loadPlugin(amorphBufferPlugin)
Amorph.ready()

function padLeft(array, length) {
  if (array.length === length) {
    return array
  }
  if (array.length > length) {
    throw new Error('Array greater than length')
  }
  return Array(length - array.length).fill(0).concat(array)
}

exports.marshalRecord = function marshalRecord(timestamp, origin, sender, tag, value, documentHash, previousRecordHash) {
  arguguard('marshalRecord', [Amorph, Amorph, Amorph, Amorph, Amorph, Amorph, Amorph], arguments)

  var expectedLengths = [4, 20, 20, 4, 8, 32, 32]
  var array = []

  expectedLengths.forEach((expectedLength, index) => {
    const _array = arguments[index].to('array')
    if (_array.length !== expectedLength) {
      throw new BytesLengthError(`Argument #${index} should be ${expectedLength} bytes, receieved ${_array.length}`)
    }
    array.push(..._array)
  })

  return new Amorph(array, 'array')
}

exports.unmarshalRecord = function parseRecord(record) {
  arguguard('unmarshalRecord', [Amorph], arguments)
  if (record.to('array').length !== 120) {
    throw new BytesLengthError(`Record should be 120 bytes, received ${record.to('array').length}`)
  }
  return {
    timestamp: record.as('array', (array) => {
      return array.slice(0, 4)
    }),
    origin: record.as('array', (array) => {
      return array.slice(4, 24)
    }),
    sender: record.as('array', (array) => {
      return array.slice(24, 44)
    }),
    tag: record.as('array', (array) => {
      return array.slice(44, 48)
    }),
    value: record.as('array', (array) => {
      return array.slice(48, 56)
    }),
    documentHash: record.as('array', (array) => {
      return array.slice(56, 88)
    }),
    previousRecordHash: record.as('array', (array) => {
      return array.slice(88, 120)
    })
  }
}

function isAllZeros(amorph) {
  return amorph.to('array').reduce((a, b) => {
    return a + b
  }, 0) === 0
}

exports.downloadRecords = function downloadRecords(recordHash, getter, setter) {
  arguguard('download', [Amorph, 'function', 'function'], arguments)
  const recordMultihash = ipfsUtils.unstripSha2256Hash(recordHash)
  return getter(recordMultihash).then((record) => {
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
