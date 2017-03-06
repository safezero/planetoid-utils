const chai = require('chai')
const utils = require('./')
const BytesLengthError = require('./errors/BytesLengthError')
const crypto = require('crypto')
const Amorph = require('amorph')
const chaiAmorph = require('chai-amorph')
const Q = require('q')
const random = require('random-amorph')
const keccak256 = require('keccak256-amorph')

chai.use(chaiAmorph)
chai.should()

const tempDb = {}

const tempDbApi = {
  addFile: function addFile(file) {
    const fileHash = keccak256(file)
    tempDb[fileHash.to('hex')] = file
  },
  getFile: function getFile(fileHash) {
    return tempDb[fileHash.to('hex')]
  }
}


describe('planetoid-utils', () => {

  const params = Array(10).fill(0).map(() => {
    return {
      timestamp: random(4),
      sender: random(20),
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
        param.sender,
        param.value,
        param.documentHash,
        recordHash
      )
      recordHash = keccak256(record)
      return record
    })
    records.push(..._records)
  })

  it('each record should be 96 bytes long', () => {
    records.forEach((record) => {
      record.to('array').should.have.length(96)
    })
  })

  it('should add all 10 records tempdb', () => {
    records.forEach((record) => {
      tempDbApi.addFile(record)
    })
  })

  it('should download records', () => {
    return utils.downloadRecords(recordHash, (_recordHash) => {
      return Q.resolve(tempDbApi.getFile(_recordHash))
    }, (_recordHash, record) => {
      downloadedRecords.push(record)
      return Q.resolve()
    })
  })

  it('downloaded records should match records', () => {
    downloadedRecords.should.have.length(records.length)
    downloadedRecords.forEach((downloadedRecord, index) => {
      downloadedRecord.should.have.keys([
        'timestamp',
        'sender',
        'value',
        'documentHash',
        'previousRecordHash'
      ])
      const param = params[params.length - index - 1]
      downloadedRecord.timestamp.should.amorphEqual(param.timestamp, 'array')
      downloadedRecord.sender.should.amorphEqual(param.sender)
      downloadedRecord.value.should.amorphEqual(param.value)
      downloadedRecord.documentHash.should.amorphEqual(param.documentHash)
      downloadedRecord.previousRecordHash.should.amorphEqual(param.previousRecordHash)
    })
  })

  it('should throw byteslength error when marshalling with bad arguments lengths', () => {
    const param = params[0]
    ;(() => {
      utils.marshalRecord(random(3), param.sender, param.value, param.documentHash, param.previousRecordHash)
    }).should.throw(BytesLengthError)
    ;(() => {
      utils.marshalRecord(param.timestamp, param.sender, random(3), param.documentHash, param.previousRecordHash)
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
