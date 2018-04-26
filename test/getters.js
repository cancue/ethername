const Ethername = artifacts.require('./Ethername.sol')

contract('Ethername Getters', (accounts) => {
  let ethername
  let guest = accounts[9]
  let nameProper = {
    name: 'thename',
    owner: accounts[1]
  }
  let nameNL = {
    name: '12345678901234567890123456789012',
    owner: accounts[2]
  }
  let nameSL = {
    name: 'abcdefghijklmnopqrstuvwxyzabcdef',
    owner: accounts[3]
  }
  let validNames = [nameProper, nameNL, nameSL]
  let nameInvalidNL = '123456789012345678901234567890123'
  let nameInvalidSL = 'abcdefghijklmnopqrstuvwxyzabcdefg'
  let invalidNames = [nameInvalidNL, nameInvalidSL]

  before(async () => {
    ethername = await Ethername.deployed()
    for (let _valid of validNames) {
      await ethername.rawRegister(strToBytes(_valid.name),
        {
          from: _valid.owner
        }
      )
    }
  })

  describe('nameOf', () => {
    it('should return proper name', async () => {
      for (let _valid of validNames) {
        let _name = await ethername.nameOf(_valid.owner)
        assert.equal(_name, _valid.name)
      }
    })

    it("should return '' if guest", async () => {
      let _name = await ethername.nameOf(guest)
      assert.equal(_name, '')
    })
  })

  describe('ownerOf', () => {
    it('should return proper owner', async () => {
      for (let _valid of validNames) {
        let _owner = await ethername.ownerOf(_valid.name)
        assert.equal(_owner, _valid.owner)
      }
    })

    it("should return '' if guest", async () => {
      let _owner = await ethername.ownerOf('')
      assert.equal(_owner, ethername.address)
    })

    it('should throw if too long', async () => {
      for (let _invalidName of invalidNames) {
        try {
          await ethername.ownerOf(_invalidName)
          throw new Error('error')
        } catch (err) {
          assert.equal(err, 'Error: VM Exception while processing transaction: revert')
        }
      }
    })
  })

  describe('detailsOf', () => {
    it('should return proper owner', async () => {
      for (let _valid of validNames) {
        let _res = await ethername.detailsOf(_valid.name, 'page')
        assert.equal(_res[0], _valid.owner)
      }
    })

    it('should return ethername address without name', async () => {
      let _res = await ethername.detailsOf('', 'page')
      assert.equal(_res[0], ethername.address)
    })

    it('should throw if too long', async () => {
      for (let _invalidName of invalidNames) {
        try {
          await ethername.detailsOf(_invalidName, 'page')
          throw new Error('error')
        } catch (err) {
          assert.equal(err, 'Error: VM Exception while processing transaction: revert')
        }
      }
    })

    describe('attrs', () => {
      let user = nameProper.owner
      let name = nameProper.name
      let attrs = [
        {
          key: '',
          value: '0x01'
        },
        {
          key: 'page',
          value: '0x02'
        },
        {
          key: nameNL.name,
          value: '0x03'
        },
        {
          key: nameSL.name,
          value: '0x04'
        }
      ]

      before(async () => {
        ethername = await Ethername.deployed()
        for (let attr of attrs) {
          let key = attr.key === '' ? '0x00' : strToBytes(attr.key)
          await ethername.rawSetAttribute(
            strToBytes(name),
            key,
            attr.value,
            {
              from: user
            }
          )
        }
      })

      it('should return proper value', async () => {
        for (let attr of attrs) {
          let _res = await ethername.detailsOf(name, attr.key)
          assert.equal(_res[2], attr.value)
        }
      })

      it('should throw if too long', async () => {
        for (let _invalidName of invalidNames) {
          try {
            await ethername.detailsOf(name, _invalidName)
            throw new Error('error')
          } catch (err) {
            assert.equal(err, 'Error: VM Exception while processing transaction: revert')
          }
        }
      })
    })
  })
})

contract('Ethername Raw Getters', (accounts) => {
  let ethername
  let guest = accounts[9]
  let nameProper = {
    name: 'thename',
    owner: accounts[1]
  }
  let nameNL = {
    name: '12345678901234567890123456789012',
    owner: accounts[2]
  }
  let nameSL = {
    name: 'abcdefghijklmnopqrstuvwxyzabcdef',
    owner: accounts[3]
  }
  let validNames = [nameProper, nameNL, nameSL]
  let nameInvalidNL = '123456789012345678901234567890123'
  let nameInvalidSL = 'abcdefghijklmnopqrstuvwxyzabcdefg'

  before(async () => {
    ethername = await Ethername.deployed()
    for (let _valid of validNames) {
      await ethername.rawRegister(strToBytes(_valid.name),
        {
          from: _valid.owner
        }
      )
    }
  })

  describe('rawNameOf', () => {
    it('should return proper name', async () => {
      for (let _valid of validNames) {
        let _name = await ethername.rawNameOf(_valid.owner)
        assert.equal(bytesToStr(_name), _valid.name)
      }
    })

    it("should return '' if guest", async () => {
      let _name = await ethername.rawNameOf(guest)
      assert.equal(bytesToStr(_name), '')
    })
  })

  describe('rawOwnerOf', () => {
    it('should return proper owner', async () => {
      for (let _valid of validNames) {
        let _owner = await ethername.rawOwnerOf(strToBytes(_valid.name))
        assert.equal(_owner, _valid.owner)
      }
    })

    it("should return '' if guest", async () => {
      let _owner = await ethername.rawOwnerOf(strToBytes(''))
      assert.equal(_owner, ethername.address)
    })

    it('should return auto cut if too long', async () => {
      let _owner = await ethername.rawOwnerOf(strToBytes(nameInvalidNL))
      assert.equal(_owner, nameNL.owner)
      _owner = await ethername.rawOwnerOf(strToBytes(nameInvalidSL))
      assert.equal(_owner, nameSL.owner)
    })
  })

  describe('rawDetailsOf', () => {
    it('should return proper owner', async () => {
      for (let _valid of validNames) {
        let _res = await ethername.rawDetailsOf(strToBytes(_valid.name), strToBytes('page'))
        assert.equal(_res[0], _valid.owner)
      }
    })

    it('should return ethername address without name', async () => {
      let _res = await ethername.rawDetailsOf(0, strToBytes('page'))
      assert.equal(_res[0], ethername.address)
    })

    it('should return auto cut if too long', async () => {
      let _res = await ethername.rawDetailsOf(strToBytes(nameInvalidNL), 0x00)
      assert.equal(_res[0], nameNL.owner)
      _res = await ethername.rawDetailsOf(strToBytes(nameInvalidSL), 0x00)
      assert.equal(_res[0], nameSL.owner)
    })

    describe('attrs', () => {
      let user = nameProper.owner
      let name = nameProper.name
      let attrs = [
        {
          key: '',
          value: '0x01'
        },
        {
          key: 'page',
          value: '0x02'
        },
        {
          key: nameNL.name,
          value: '0x03'
        },
        {
          key: nameSL.name,
          value: '0x04'
        }
      ]

      before(async () => {
        ethername = await Ethername.deployed()
        for (let attr of attrs) {
          let key = attr.key === '' ? '0x00' : strToBytes(attr.key)
          await ethername.rawSetAttribute(
            strToBytes(name),
            key,
            attr.value,
            {
              from: user
            }
          )
        }
      })

      it('should return proper value', async () => {
        for (let attr of attrs) {
          let _res = await ethername.rawDetailsOf(strToBytes(name), strToBytes(attr.key))
          assert.equal(_res[2], attr.value)
        }
      })

      it('should return auto cut if too long', async () => {
        let _res = await ethername.rawDetailsOf(strToBytes(name), strToBytes(nameInvalidNL))
        assert.equal(_res[2], '0x03')
        _res = await ethername.rawDetailsOf(strToBytes(name), strToBytes(nameInvalidSL))
        assert.equal(_res[2], '0x04')
      })
    })
  })
})

function bytesToStr (_bytes) {
  return web3.toAscii(_bytes).replace(/\u0000/g, '')
}
function strToBytes (_str) {
  return web3.fromAscii(_str)
}
