const chai = require('chai')
const utils = require('./')
const BytesLengthError = require('./errors/BytesLengthError')
const crypto = require('crypto')
const Amorph = require('amorph')
const chaiAmorph = require('chai-amorph')

chai.use(chaiAmorph)
chai.should()

function random(length) {
  return new Amorph(crypto.randomBytes(length), 'buffer')
}

describe('planetoid-utils', () => {
  const timestamp = random(4)
  const origin = random(20)
  const sender = random(20)
  const tag = random(4)
  const value = random(8)
  const documentHash = random(32)
  const previousRecordHash = random(32)
  let record
  let unmarshalledRecord

  it('should marshalRecord', () => {
    record = utils.marshalRecord(timestamp, origin, sender, tag, value, documentHash, previousRecordHash)
    record.to('array').should.have.length(120)
  })

  it('should unmarshalRecord correctly', () => {
    unmarshalledRecord = utils.unmarshalRecord(record)
    unmarshalledRecord.should.have.keys([
      'timestamp',
      'origin',
      'sender',
      'tag',
      'value',
      'documentHash',
      'previousRecordHash'
    ])
    unmarshalledRecord.timestamp.should.amorphEqual(timestamp)
    unmarshalledRecord.origin.should.amorphEqual(origin)
    unmarshalledRecord.sender.should.amorphEqual(sender)
    unmarshalledRecord.tag.should.amorphEqual(tag)
    unmarshalledRecord.value.should.amorphEqual(value)
    unmarshalledRecord.documentHash.should.amorphEqual(documentHash)
    unmarshalledRecord.previousRecordHash.should.amorphEqual(previousRecordHash)
  })

  it('should throw byteslength error when marshalling with bad arguments lengths', () => {
    ;(() => {
      utils.marshalRecord(random(3), origin, sender, tag, value, documentHash, previousRecordHash)
    }).should.throw(BytesLengthError)
    ;(() => {
      utils.marshalRecord(timestamp, origin, sender, tag, random(3), documentHash, previousRecordHash)
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
