import React, { Component } from "react"
import './App.css'
import { getWeb3 } from "./getWeb3"
import map from "./artifacts/deployments/map.json"
import { getEthereum } from "./getEthereum"
class App extends Component {
    state = {
        web3: null,
        accounts: null,
        chainid: null,
        simpleStorage: null,
        storageValue: 0,
        storageInput: 0,
        transactionHash: null
    }
    componentDidMount = async () => {
        // Get network provider and web3 instance.
        const web3 = await getWeb3()
        // Try and enable accounts (connect metamask)
        try {
            const ethereum = await getEthereum()
            // ethereum.enable()
            ethereum.request({ method: 'eth_requestAccounts' });
        } catch (e) {
            console.log(`Could not enable accounts. 
            Interaction with contracts not available.
            Use a modern browser with a Web3 plugin to fix this issue.`)
            console.log(e)
        }
        // Use web3 to get the users accounts
        const accounts = await web3.eth.getAccounts()
        // Get the current chain id
        const chainid = parseInt(await web3.eth.getChainId())
        this.setState({
            web3,
            accounts,
            chainid
        }, await this.loadInitialContracts)
    }
    loadInitialContracts = async () => {
        var _chainID = 0;
        if (this.state.chainid === 3) {
            _chainID = 3;
        }
        if (this.state.chainid === 1337) {
            _chainID = "dev"
        }
        const simpleStorage = await this.loadContract(_chainID, "SimpleStorage")
        if (!simpleStorage) {
            return
        }
        const storageValue = await simpleStorage.methods.get().call()
        this.setState({
            simpleStorage,
            storageValue,
        })
    }
    loadContract = async (chain, contractName) => {
        // Load a deployed contract instance into a web3 contract object
        const { web3 } = this.state
        // Get the address of the most recent deployment from the deployment map
        let address
        try {
            address = map[chain][contractName][0]
        } catch (e) {
            console.log(`Could not find any deployed contract "${contractName}" on the chain "${chain}".`)
            return undefined
        }
        // Load the artifact with the specified address
        let contractArtifact
        try {
            contractArtifact = await import(`./artifacts/deployments/${chain}/${address}.json`)
        } catch (e) {
            console.log(`Failed to load contract artifact "./artifacts/deployments/${chain}/${address}.json"`)
            return undefined
        }
        return new web3.eth.Contract(contractArtifact.abi, address)
    }
    changeStorage = async (e) => {
        const { accounts, simpleStorage, storageInput } = this.state
        e.preventDefault()
        const value = parseInt(storageInput)
        if (isNaN(value)) {
            alert("invalid value")
            return
        }
        await simpleStorage.methods.set(value).send({ from: accounts[0] })
            .on('transactionHash', async (transactionHash) => {
                this.setState({ transactionHash })
            })
            .on('receipt', async () => {
                this.setState({
                    storageValue: await simpleStorage.methods.get().call()
                })
            })
    }
    render() {
        const {
            web3,
            accounts,
            simpleStorage,
            storageValue,
            storageInput,
            transactionHash
        } = this.state
        if (!web3) {
            return <div>Loading Web3, accounts, and contracts...</div>
        }
        if (!simpleStorage) {
            return <div>Could not find a deployed contract. Check console for details.</div>
        }
        const isAccountsUnlocked = accounts ? accounts.length > 0 : false
        return (<div className="App">
            {
                !isAccountsUnlocked ?
                    <p><strong>Connect with Metamask and refresh the page to
                        be able to edit the storage fields.</strong>
                    </p>
                    : null
            }
            <h1>Simple Storage</h1>
            <div>The current stored value is {storageValue}.</div>
            <br />
            <form onSubmit={(e) => this.changeStorage(e)}>
                <div>
                    <label>Change the value to </label>
                    <input
                        name="storageInput"
                        type="text"
                        value={storageInput}
                        onChange={(e) => this.setState({ storageInput: e.target.value })}
                    />.
                    <p>
                        <button type="submit" disabled={!isAccountsUnlocked}>Submit</button>
                    </p>
                </div>
            </form>
            <br />
            {transactionHash ?
                <div>
                    <p>Last transaction Hash: {transactionHash}</p>
                </div>
                : null
            }
        </div>)
    }
}
export default App