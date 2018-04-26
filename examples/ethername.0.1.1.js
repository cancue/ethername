// All you need to know: abi, addr
let enm = {
  abi: [{"constant":true,"inputs":[{"name":"_address","type":"address"}],"name":"nameOf","outputs":[{"name":"_name","type":"string"}],"payable":false,"stateMutability":"view","type":"function"}],
  addr: {
    1: '0x397c7f9c38e09b7024063e6879d45b58e5effdbf',
    3: '0x41fd31c43be1373280b9d622efedf2518921deae'
  }
}

// set test function
enm.test = (_name) => {
  if (_name === '') {
    if (window.confirm('You have no name. Click "OK" to go Ethername for registration!')) 
    {
      window.location.href='https://ethername.co'
    }
  } else {
    alert(`Hello, ${_name}!`)
  }
}

// set examples by web3js version
enm.example = {
  ver1: async (_enm) => {
    let _netId = await window.web3.eth.net.getId() // get network id
    _enm.contract = new web3.eth.Contract(_enm.abi, _enm.addr[_netId]) // set contract
    let _userAddr = await window.web3.eth.getAccounts() // get current user address
    let _name = await _enm.contract.methods.nameOf(_userAddr[0]).call() // call nameOf API
    _enm.test(_name) // test
  },
  ver0: (_enm) => {
    window.web3.version.getNetwork((err, _netId) => { // get network id
      _enm.contract = web3.eth.contract(_enm.abi).at(_enm.addr[_netId]) // set contract
      window.web3.eth.getAccounts((err, res) => { // get current user address
        _enm.contract.nameOf.call(res[0], (err, res) => { // call nameOf API
          if (err) return error(err)
          _enm.test(res) // test
        })
      })

    })
  }
}

// set call function
enm.call = () => {
  // check web3js version
  if (typeof window.web3 !== 'undefined') {
    let _verWeb3 = web3.version
    if (typeof _verWeb3 === 'string' && _verWeb3[0] === '1') {
      enm.example.ver1(enm)
    } else {
      enm.example.ver0(enm)
    }
  }
}

enm.call()
