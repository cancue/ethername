const Ethername = artifacts.require('./Ethername.sol')
let commission = 1.02

contract('Constructor', (accounts) => {
  let ethername

  before(async () => {
    ethername = await Ethername.deployed()
  })

  it('should set reserved words', async () => {
    let _list = ['']
    for (let _str of _list) {
      let _owner = await ethername.ownerOf(_str)
      assert.equal(_owner, ethername.address)
    }
  })

  it('should register initial words', async () => {
    let _list = ['root']
    for (let _str of _list) {
      let _owner = await ethername.ownerOf(_str)
      assert.equal(_owner, accounts[0])
    }
  })
})

contract('_register', (accounts) => {
  let ethername

  before(async () => {
    ethername = await Ethername.deployed()
  })

  describe('register', () => {
    it('should work without donation', async () => {
      let _name = 'registerwithoutdonation'
      let _sender = accounts[1]

      let _res = await ethername.register(_name,
        {
          from: _sender
        }
      )
      let _owner = await ethername.ownerOf(_name)
      assert.equal(_owner, _sender)

      assert.equal(_res.logs[0].event, 'Name')
      assert.equal(_res.logs[0].args.owner, _sender)
      assert.equal(bytesToStr(_res.logs[0].args.name), _name)
      assert.equal(_res.logs[1].event, 'Transfer')
      assert.equal(_res.logs[1].args.from, NULL_ADDRESS)
      assert.equal(_res.logs[1].args.to, _sender)
      assert.equal(bytesToStr(_res.logs[1].args.name), _name)
    })

    it('should work with donation', async () => {
      let _val = web3.toWei(0.001, 'ether')
      let _name = 'registerwithdonation'
      let _sender = accounts[1]

      await ethername.register(_name,
        {
          from: accounts[1],
          value: _val
        }
      )
      let _owner = await ethername.ownerOf(_name)
      assert.equal(_owner, _sender)

      let _balance = await web3.eth.getBalance(ethername.address)
      assert.equal(_balance.toNumber(), _val)
    })
  })

  describe('validation', () => {
    it('should accept only alphabet lowercase and number', async () => {
      let _av69WithDot = 'abcdefghijklmnopqrstu.v6789'
      try {
        await ethername.register(_av69WithDot,
          {
            from: accounts[1]
          }
        )
      } catch (err) {
        assert.equal(err, 'Error: VM Exception while processing transaction: revert')
      }
      let _owner = await ethername.ownerOf(_av69WithDot)
      assert.equal(_owner, 0)

      let _aTo5 = 'abcdefghijklmnopqrstuvwxyz012345'
      await ethername.register(_aTo5,
        {
          from: accounts[1]
        }
      )
      _owner = await ethername.ownerOf(_aTo5)
      assert.equal(_owner, accounts[1])

      let _6v = '6789abcdefghijklmnopqrstuv'
      await ethername.register(_6v,
        {
          from: accounts[1]
        }
      )
      _owner = await ethername.ownerOf(_6v)
      assert.equal(_owner, accounts[1])
    })
  })
})

contract('wiper', (accounts) => {
  let ethername
  let name = 'theuser'
  let owner = accounts[1]
  let approved = accounts[3]
  let receiver = accounts[4]

  before(async () => {
    ethername = await Ethername.deployed()
    await ethername.register(name,
      {
        from: owner
      }
    )

    // owner
    let _owner = await ethername.ownerOf(name)
    assert.equal(_owner, owner)

    // name
    let _ownerName = await ethername.nameOf(owner)
    assert.equal(_ownerName, name)

    // approve
    await ethername.approve(approved, name,
      {
        from: owner
      }
    )
    let _approved = await ethername.nameToApproved(name)
    assert.equal(_approved, approved)

    // attribute
    await ethername.setAttribute(name, 'page', '0x59',
      {
        from: owner
      }
    )

    let _res = await ethername.detailsOf(name, 'page')
    assert.equal(_res[2], '0x59')

    let _currentName = await ethername.nameOf(receiver)
    assert.equal(_currentName, '')
  })

  it('transfer should wipe all except for attrs', async () => {
    await ethername.transfer(receiver, name,
      {
        from: owner
      }
    )
    // owner
    let _owner = await ethername.ownerOf(name)
    assert.equal(_owner, receiver)
    // name
    let _ownerName = await ethername.nameOf(owner)
    assert.equal(_ownerName, '')
    let _receiverName = await ethername.nameOf(receiver)
    assert.equal(_receiverName, name)
    // approved
    let _approved = await ethername.nameToApproved(name)
    assert.equal(_approved, 0)
    // attribute
    let _res = await ethername.detailsOf(name, 'page')
    assert.equal(_res[2], '0x59')
  })

  describe('wipeAttributes', () => {
    let attrs = ['page1', 'page2', 'page3', 'page4', 'page5', 'page6', 'page7', 'page8', 'page9', 'page10', 'page11', 'page12', 'page13', 'page14', 'page15', 'page16', 'page17', 'page18', 'page19', 'page20', 'page21']
    let bytesAttrs = attrs.map((e) => strToBytes(e))

    before(async () => {
      for (let _attr of attrs) {
        await ethername.setAttribute(name, _attr, strToBytes(_attr),
          {
            from: receiver
          }
        )
        let _res = await ethername.detailsOf(name, _attr)
        assert.equal(_res[2], strToBytes(_attr))
      }
    })

    it('wipeAttributes should not work unless owner', async () => {
      try {
        await ethername.wipeAttributes(name, bytesAttrs,
          {
            from: owner
          }
        )
      } catch (err) {
        assert.equal(err, 'Error: VM Exception while processing transaction: revert')
      }

      for (let _attr of attrs) {
        let _res = await ethername.detailsOf(name, _attr)
        assert.equal(_res[2], strToBytes(_attr))
      }
    })

    it('wipeAttributes should work if owner', async () => {
      let _res = await ethername.wipeAttributes(name, bytesAttrs,
        {
          from: receiver
        }
      )

      for (let _attr of attrs) {
        let _res = await ethername.detailsOf(name, _attr)
        assert.equal(_res[2], '0x')
      }

      let _attrs64 = bytesAttrs.map((attr) => attr.padEnd(66, '0'))

      for (let i; i < _attrs64.length; i++) {
        assert.equal(_res.logs[0].event, 'Attribute')
        assert.equal(_res.logs[0].args.key, _attrs64[i])
        assert.equal(bytesToStr(_res.logs[0].args.name), name)
      }
    })
  })
})

contract('transfer', (accounts) => {
  let ethername
  let name = 'theuser'
  let owner = accounts[1]

  before(async () => {
    ethername = await Ethername.deployed()
    await ethername.register(name,
      {
        from: owner
      }
    )
    let _owner = await ethername.ownerOf(name)
    assert.equal(_owner, owner)
  })

  it('should work if owner', async () => {
    let _receiver = accounts[2]

    let _res = await ethername.transfer(_receiver, name,
      {
        from: owner
      }
    )
    let _owner = await ethername.ownerOf(name)
    assert.equal(_owner, _receiver)
    let _senderName = await ethername.nameOf(owner)
    assert.equal(_senderName, '')

    assert.equal(_res.logs[0].event, 'Name')
    assert.equal(_res.logs[0].args.owner, owner)
    assert.equal(_res.logs[0].args.name, NULL_BYTES)
    assert.equal(_res.logs[1].event, 'Name')
    assert.equal(_res.logs[1].args.owner, _receiver)
    assert.equal(bytesToStr(_res.logs[1].args.name), name)
    assert.equal(_res.logs[2].event, 'Transfer')
    assert.equal(_res.logs[2].args.from, owner)
    assert.equal(_res.logs[2].args.to, _receiver)
    assert.equal(bytesToStr(_res.logs[2].args.name), name)
  })

  it('should not work unless owner', async () => {
    let _sender = accounts[0]
    let _nameOwner = accounts[2]
    let _name = await ethername.nameOf(_nameOwner)
    assert.notEqual(_name, '')
    let _receiver = accounts[1]

    try {
      await ethername.transfer(_receiver, _name,
        {
          from: _sender
        }
      )
    } catch (err) {
      assert.equal(err, 'Error: VM Exception while processing transaction: revert')
    }

    let _owner = await ethername.ownerOf(_name)
    assert.equal(_owner, _nameOwner)
  })
})

contract('approve', (accounts) => {
  let ethername
  let name = 'theuser'
  let owner = accounts[1]

  before(async () => {
    ethername = await Ethername.deployed()

    await ethername.register(name,
      {
        from: owner
      }
    )
    let _owner = await ethername.ownerOf(name)
    assert.equal(_owner, owner)
  })

  it('should work if owner', async () => {
    let _receiver = accounts[2]

    let _res = await ethername.approve(_receiver, name,
      {
        from: owner
      }
    )
    let _approved = await ethername.nameToApproved(name)
    assert.equal(_approved, _receiver)

    assert.equal(_res.logs[0].event, 'Approval')
    assert.equal(_res.logs[0].args.owner, owner)
    assert.equal(_res.logs[0].args.approved, _receiver)
    assert.equal(bytesToStr(_res.logs[0].args.name), name)
  })

  it('should not work unless owner', async () => {
    let _sender = accounts[0]
    let _receiver = accounts[3]

    try {
      await ethername.approve(_receiver, name,
        {
          from: _sender
        }
      )
    } catch (err) {
      assert.equal(err, 'Error: VM Exception while processing transaction: revert')
    }

    let _approved = await ethername.nameToApproved(name)
    assert.notEqual(_approved, _receiver)
  })
})

contract('transferFrom', (accounts) => {
  let ethername
  let name = 'theuser'
  let owner = accounts[1]
  let approved = accounts[2]

  before(async () => {
    ethername = await Ethername.deployed()

    await ethername.register(name,
      {
        from: owner
      }
    )
    let _owner = await ethername.ownerOf(name)
    assert.equal(_owner, owner)

    await ethername.approve(approved, name,
      {
        from: owner
      }
    )
    let _approved = await ethername.nameToApproved(name)
    assert.equal(_approved, approved)
  })

  it('should not work unless approved', async () => {
    let _sender = accounts[0]
    let _receiver = accounts[3]

    try {
      await ethername.transferFrom(owner, _receiver, name,
        {
          from: _sender
        }
      )
    } catch (err) {
      assert.equal(err, 'Error: VM Exception while processing transaction: revert')
    }

    let _owner = await ethername.ownerOf(name)
    assert.notEqual(_owner, _receiver)
  })

  it('should work by approved', async () => {
    let _receiver = accounts[3]

    let _res = await ethername.transferFrom(owner, _receiver, name,
      {
        from: approved
      }
    )
    let _owner = await ethername.ownerOf(name)
    assert.equal(_owner, _receiver)

    assert.equal(_res.logs[0].event, 'Approval')
    assert.equal(_res.logs[0].args.owner, owner)
    assert.equal(_res.logs[0].args.approved, NULL_ADDRESS)
    assert.equal(bytesToStr(_res.logs[0].args.name), name)
    assert.equal(_res.logs[1].event, 'Name')
    assert.equal(_res.logs[1].args.owner, owner)
    assert.equal(_res.logs[1].args.name, NULL_BYTES)
    assert.equal(_res.logs[2].event, 'Name')
    assert.equal(_res.logs[2].args.owner, _receiver)
    assert.equal(bytesToStr(_res.logs[2].args.name), name)
    assert.equal(_res.logs[3].event, 'Transfer')
    assert.equal(_res.logs[3].args.from, owner)
    assert.equal(_res.logs[3].args.to, _receiver)
    assert.equal(bytesToStr(_res.logs[3].args.name), name)
  })
})

contract('setPrice', (accounts) => {
  let ethername
  let name = 'theuser'
  let owner = accounts[1]

  before(async () => {
    ethername = await Ethername.deployed()

    await ethername.register(name,
      {
        from: owner
      }
    )
    let _owner = await ethername.ownerOf(name)
    assert.equal(_owner, owner)
  })

  it('should work if owner', async () => {
    let _price = web3.toWei(0.001, 'ether')

    let _res = await ethername.setPrice(name, _price,
      {
        from: owner
      }
    )

    let _details = await ethername.detailsOf(name, 'page')
    assert.equal(_details[1].toNumber(), Number(_price) * commission)

    assert.equal(_res.logs[0].event, 'Price')
    assert.equal(_res.logs[0].args.price.toString(), _price)
    assert.equal(bytesToStr(_res.logs[0].args.name), name)
  })

  it('should not work unless owner', async () => {
    let _sender = accounts[0]
    let _price = web3.toWei(0.002, 'ether')

    try {
      await ethername.setPrice(name, _price,
        {
          from: _sender
        }
      )
    } catch (err) {
      assert.equal(err, 'Error: VM Exception while processing transaction: revert')
    }

    let _res = await ethername.detailsOf(name, 'page')
    assert.notEqual(_res[1].toString(), _price)
  })

  it('should work only if less than 2^128', async () => {
    let _price = String(2 ** 128)

    try {
      await ethername.setPrice(name, _price,
        {
          from: owner
        }
      )
    } catch (err) {
      assert.equal(err, 'Error: VM Exception while processing transaction: revert')
    }

    let _res = await ethername.detailsOf(name, '')
    assert.notEqual(_res[1].toNumber(), Number(_price) * commission)

    _price = String(2 ** 64 - 1)
    await ethername.setPrice(name, _price,
      {
        from: owner
      }
    )
    _res = await ethername.detailsOf(name, '')
    assert.equal(_res[1].toNumber(), Number(_price) * commission)
  })
})

contract('buy', (accounts) => {
  let ethername
  let name = 'theuser'
  let owner = accounts[1]
  let price = web3.toWei(0.1, 'ether')

  before(async () => {
    ethername = await Ethername.deployed()

    await ethername.register(name,
      {
        from: owner
      }
    )
    let _owner = await ethername.ownerOf(name)
    assert.equal(_owner, owner)

    await ethername.setPrice(name, price,
      {
        from: owner
      }
    )
    let _res = await ethername.detailsOf(name, 'page')
    assert.equal(_res[1].toNumber(), Number(price) * commission)
  })

  it('should work with enough ether', async () => {
    let _ether = web3.toWei(0.2, 'ether')
    let _buyer = accounts[2]
    let _ownerBalance = await web3.eth.getBalance(owner)
    let _buyerBalance = await web3.eth.getBalance(_buyer)

    let _res = await ethername.buy(name,
      {
        from: _buyer,
        value: _ether
      }
    )

    let _owner = await ethername.ownerOf(name)
    assert.equal(_owner, _buyer)

    let _ownerBalanceAfterDeal = await web3.eth.getBalance(owner)
    let _buyerBalanceAfterDeal = await web3.eth.getBalance(_buyer)
    assert.equal(_ownerBalanceAfterDeal.toNumber(), _ownerBalance.toNumber() + Number(price))
    let _difference = _buyerBalance.toNumber() - _buyerBalanceAfterDeal.toNumber()
    assert(_difference > Number(price), `too less, ${_difference}`)
    assert(_difference < Number(_ether), `too much, ${_difference}`)

    assert.equal(_res.logs[0].event, 'Name')
    assert.equal(_res.logs[0].args.owner, owner)
    assert.equal(_res.logs[0].args.name, NULL_BYTES)
    assert.equal(_res.logs[1].event, 'Name')
    assert.equal(_res.logs[1].args.owner, _buyer)
    assert.equal(bytesToStr(_res.logs[1].args.name), name)
    assert.equal(_res.logs[2].event, 'Transfer')
    assert.equal(_res.logs[2].args.from, owner)
    assert.equal(_res.logs[2].args.to, _buyer)
    assert.equal(bytesToStr(_res.logs[2].args.name), name)
    assert.equal(_res.logs[3].event, 'Buy')
    assert.equal(_res.logs[3].args.price.toNumber(), Number(price) * commission)
    assert.equal(_res.logs[3].args.buyer, _buyer)
    assert.equal(bytesToStr(_res.logs[3].args.name), name)
  })
})

contract('buy should not work', (accounts) => {
  let ethername
  let name = 'theuser'
  let owner = accounts[1]
  let price = web3.toWei(0.1, 'ether')

  before(async () => {
    ethername = await Ethername.deployed()

    await ethername.register(name,
      {
        from: owner
      }
    )
    let _owner = await ethername.ownerOf(name)
    assert.equal(_owner, owner)

    await ethername.setPrice(name, price,
      {
        from: owner
      }
    )
    let _res = await ethername.detailsOf(name, 'page')
    assert.equal(_res[1].toNumber(), Number(price) * commission)
  })

  it('with less ether', async () => {
    let _ether = web3.toWei(0.09, 'ether')
    let _buyer = accounts[2]

    try {
      await ethername.buy(name,
        {
          from: _buyer,
          value: _ether
        }
      )
    } catch (err) {
      assert.equal(err, 'Error: VM Exception while processing transaction: revert')
    }

    let _owner = await ethername.ownerOf(name)
    assert.equal(_owner, owner)
  })

  it('if price is zero', async () => {
    let _ether = web3.toWei(10, 'ether')
    let _buyer = accounts[2]
    await ethername.setPrice(name, 0,
      {
        from: owner
      }
    )

    try {
      await ethername.buy(name,
        {
          from: _buyer,
          value: _ether
        }
      )
    } catch (err) {
      assert.equal(err, 'Error: VM Exception while processing transaction: revert')
    }

    let _owner = await ethername.ownerOf(name)
    assert.equal(_owner, owner)
  })
})

contract('useName', (accounts) => {
  let ethername
  let names = ['name1', 'name2', 'name3']
  let owner = accounts[1]
  let otherName = 'other'
  let other = accounts[2]

  before(async () => {
    ethername = await Ethername.deployed()

    for (let name of names) {
      await ethername.register(name,
        {
          from: owner
        }
      )
    }
    await ethername.register(web3.fromAscii(otherName),
      {
        from: other
      }
    )
  })

  it('should work if owner', async () => {
    let _index = Math.floor(Math.random() * 3)
    let _res = await ethername.useName(names[_index],
      {
        from: owner
      }
    )

    let _currentName = await ethername.nameOf(owner)
    assert.equal(_currentName, names[_index])

    assert.equal(_res.logs[0].event, 'Name')
    assert.equal(_res.logs[0].args.owner, owner)
    assert.equal(bytesToStr(_res.logs[0].args.name), names[_index])
  })

  it('should not work unless owner', async () => {
    try {
      await ethername.useName(otherName,
        {
          from: owner
        }
      )
    } catch (err) {
      assert.equal(err, 'Error: VM Exception while processing transaction: revert')
    }

    let _currentName = await ethername.nameOf(owner)
    assert.notEqual(_currentName, otherName)
  })
})

contract('setAttribute', (accounts) => {
  let ethername
  let name = 'theuser'
  let owner = accounts[1]

  before(async () => {
    ethername = await Ethername.deployed()

    await ethername.register(name,
      {
        from: owner
      }
    )
    let _owner = await ethername.ownerOf(name)
    assert.equal(_owner, owner)
  })

  it('should work if owner', async () => {
    let _key = 'page'
    let _value = 'king'

    let _res = await ethername.setAttribute(name, '', '0x59',
      {
        from: owner
      }
    )
    let _details = await ethername.detailsOf(name, '')
    assert.equal(_details[2], '0x59')

    assert.equal(_res.logs[0].event, 'Attribute')
    assert.equal(bytesToStr(_res.logs[0].args.name), name)
    assert.equal(bytesToStr(_res.logs[0].args.key), '')

    _res = await ethername.setAttribute(
      name,
      _key,
      web3.fromAscii(_value),
      {
        from: owner
      }
    )
    _details = await ethername.detailsOf(name, _key)
    assert.equal(bytesToStr(_details[2]), _value)

    assert.equal(_res.logs[0].event, 'Attribute')
    assert.equal(bytesToStr(_res.logs[0].args.name), name)
    assert.equal(bytesToStr(_res.logs[0].args.key), _key)
  })

  it('should not work unless owner', async () => {
    let _sender = accounts[0]

    try {
      await ethername.setAttribute(name, '0x00', '0x87',
        {
          from: _sender
        }
      )
    } catch (err) {
      assert.equal(err, 'Error: VM Exception while processing transaction: revert')
    }

    let _res = await ethername.detailsOf(name, 'page')
    assert.notEqual(_res[2], '0x87')
  })
})

contract('sendEther', (accounts) => {
  let ethername
  let invalidNames = [
    '',
    'noexist',
    '123456789012345678901234567890123',
    'abcdefghijklmnopqrstuvwxyzabcdefg'
  ]
  let validNames = [
    {
      name: 'thename',
      owner: accounts[1]
    },
    {
      name: '12345678901234567890123456789012',
      owner: accounts[2]
    },
    {
      name: 'abcdefghijklmnopqrstuvwxyzabcdef',
      owner: accounts[3]
    },
    {
      name: '8',
      owner: accounts[4]
    }
  ]

  let _val = web3.toWei(Math.floor(Math.random() * 3) * 0.001 + 0.001, 'ether')

  before(async () => {
    ethername = await Ethername.deployed()
    for (let _valid of validNames) {
      await ethername.register(_valid.name,
        {
          from: _valid.owner
        }
      )
    }
  })

  it('should work', async () => {
    let _senderName = await ethername.nameOf(accounts[0])
    for (let _valid of validNames) {
      let _oldBalance = await web3.eth.getBalance(_valid.owner)
      let _res = await ethername.sendEther(_valid.name,
        {
          from: accounts[0],
          value: _val
        }
      )
      let _balance = await web3.eth.getBalance(_valid.owner)
      assert.equal(_balance.toNumber() - _oldBalance.toNumber(), _val)

      assert.equal(_res.logs[0].event, 'SendEther')
      assert.equal(_res.logs[0].args.from, accounts[0])
      assert.equal(_res.logs[0].args.to, _valid.owner)
      assert.equal(bytesToStr(_res.logs[0].args.sender), _senderName)
      assert.equal(bytesToStr(_res.logs[0].args.recipient), _valid.name)
      assert.equal(_res.logs[0].args.value, _val)
    }
  })

  it('should not work with wrong name', async () => {
    let wrongCount = 0
    for (let _invalidName of invalidNames) {
      try {
        let _res = await ethername.sendEther.call(bytesToStr(_invalidName),
          {
            from: accounts[0],
            value: web3.toWei(0.001, 'ether')
          }
        )
        assert.isFalse(_res)
        wrongCount++
      } catch (err) {
        wrongCount++
        assert.equal(err, 'Error: VM Exception while processing transaction: revert')
      }
    }
    assert.equal(wrongCount, invalidNames.length)
  })
})

function bytesToStr (_bytes) {
  return web3.toAscii(_bytes).replace(/\u0000/g, '')
}
function strToBytes (_str) {
  return web3.fromAscii(_str)
}

let NULL_BYTES = '0x0000000000000000000000000000000000000000000000000000000000000000'
let NULL_ADDRESS = '0x0000000000000000000000000000000000000000'
