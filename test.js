const chai = require('chai')
const utils = require('./')
const BytesLengthError = require('./errors/BytesLengthError')
const crypto = require('crypto')
const Amorph = require('amorph')
const chaiAmorph = require('chai-amorph')
const ipfsUtils = require('ipfs-amorph-utils')
const IpfsApi = require('ipfs-amorph-api')
const Q = require('q')
const random = require('random-amorph')

const ipfsApi = new IpfsApi({
  protocol: 'https',
  host: 'ipfs.infura.io',
  port: 5001
})

chai.use(chaiAmorph)
chai.should()

describe('planetoid-utils', () => {

  const params = Array(10).fill(0).map(() => {
    return {
      timestamp: random(4),
      origin: random(20),
      sender: random(20),
      tag: random(4),
      value: random(8),
      documentHash: random(32),
    }
  })
  const records = []
  const downloadedRecords = []
  let recordHash = new Amorph(Array(32).fill(0), 'array')

  it('should create 10 records', () => {
    const _records = params.map((param, index) => {
      params[index].previousRecordHash = recordHash
      const record = utils.marshalRecord(
        param.timestamp,
        param.origin,
        param.sender,
        param.tag,
        param.value,
        param.documentHash,
        recordHash
      )
      recordHash = ipfsUtils.stripSha2256Multihash(ipfsUtils.getUnixFileMultihash(
        record
      ))
      return record
    })
    records.push(..._records)
  })

  it('should upload all 10 records to ipfs', () => {
    return Q.all(records.map((record) => {
      return ipfsApi.addFile(record)
    }))
  })

  it('should download records', () => {
    return utils.downloadRecords(recordHash, (recordMultihash) => {
      return ipfsApi.getFile(recordMultihash)
    }, (recordMultihash, record) => {
      downloadedRecords.push(record)
      return Q.resolve()
    })
  })

  it('downloaded records should match records', () => {
    downloadedRecords.should.have.length(records.length)
    downloadedRecords.forEach((downloadedRecord, index) => {
      downloadedRecord.should.have.keys([
        'timestamp',
        'origin',
        'sender',
        'tag',
        'value',
        'documentHash',
        'previousRecordHash',
        'documentMultihash',
        'previousRecordMultihash'
      ])
      const param = params[params.length - index - 1]
      downloadedRecord.timestamp.should.amorphEqual(param.timestamp, 'array')
      downloadedRecord.origin.should.amorphEqual(param.origin)
      downloadedRecord.sender.should.amorphEqual(param.sender)
      downloadedRecord.tag.should.amorphEqual(param.tag)
      downloadedRecord.value.should.amorphEqual(param.value)
      downloadedRecord.documentHash.should.amorphEqual(param.documentHash)
      downloadedRecord.previousRecordHash.should.amorphEqual(param.previousRecordHash)
    })
  })

  it('should throw byteslength error when marshalling with bad arguments lengths', () => {
    const param = params[0]
    ;(() => {
      utils.marshalRecord(random(3), param.origin, param.sender, param.tag, param.value, param.documentHash, param.previousRecordHash)
    }).should.throw(BytesLengthError)
    ;(() => {
      utils.marshalRecord(param.timestamp, param.origin, param.sender, param.tag, random(3), param.documentHash, param.previousRecordHash)
    }).should.throw(BytesLengthError)
  })

  it('should throw byteslength error when unmarshalling with bad record length', () => {
    ;(() => {
      utils.unmarshalRecord(random(0))
    }).should.throw(BytesLengthError)
    ;(() => {
      utils.unmarshalRecord(random(32))
    }).should.throw(BytesLengthError)
    ;(() => {
      utils.unmarshalRecord(random(128))
    }).should.throw(BytesLengthError)
  })
})
