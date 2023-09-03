import React, {useState, useEffect} from 'react';
import './App.css';
import * as anchor from '@project-serum/anchor'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import idl from './jabol_test.json'
import { Buffer } from 'buffer';
import * as utf8 from 'utf8';



const {SystemProgram, Keypair} = anchor.web3
const programID = new PublicKey(idl.metadata.address)
console.log(programID,'programID set correctly')
const network = clusterApiUrl('devnet')
const opts = {preflightCommitment: 'processed'}
globalThis.Buffer = Buffer; 


function App() {

  const [walletAddress, setWalletAddress] = useState(null)
  const [retrieveValue, setRetrieveValue] = useState(null)
  const [inputValue, setInputValue] = useState(' ')
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    checkWalletConnection();
  }, [])
  
const checkWalletConnection = async () => {
    try {
      if (window.solana) {
        const solana = window.solana;
        if (solana.isPhantom) {
          console.log('Phantom wallet found');
          const res = await solana.connect({ onlyIfTrusted: true });
          console.log('Connected with publicKey', res.publicKey.toBase58());
          setWalletAddress(res.publicKey.toBase58());
          setIsConnected(true);
        }
      } else {
        alert('Wallet not found');
      }
    } catch (error) {
      console.log(error);
    }
}

const disconnectWallet = async () => {
    try {
      if (window.solana) {
        const solana = window.solana;
        await solana.disconnect();
        setIsConnected(false); // Set isConnected state to false
        setIsInitialized(false);
        setWalletAddress(null);
        console.log('Wallet disconnected');
      } else {
        alert('Wallet not found');
      }
    } catch (error) {
      console.log(error);
    }
}

const getProvider = () =>{
  const connection = new Connection(network, opts.preflightCommitment)
  const provider = new anchor.AnchorProvider(
    connection,
    window.solana,
    opts.preflightCommitment,
  )
  console.log(provider, 'provider set correctly')
  return provider
} 

const Retrieve = async () => {
  try {
    const provider = getProvider();
    const program = new anchor.Program(idl, programID, provider);

    const [pda, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [utf8.encode('initial-account'), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    const account = await program.account.init.fetch(pda);
    setRetrieveValue(account.value.toString());
    console.log('retrieve value is ', retrieveValue);
  } catch (error) {
    console.log('ERROR IN FETCHING: ', error);
    setRetrieveValue(null);
  }
}

const CreateAccount = async () => {
  try {
    const provider = getProvider();
    const program = new anchor.Program(idl, programID, provider);

    const [pda, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [utf8.encode('initial-account'), provider.wallet.publicKey.toBuffer()],
      program.programId
    );
    console.log('pda', pda.toString());
    const pdaAccount = await provider.connection.getAccountInfo(pda);

    if (pdaAccount === null) {
      let tx = await program.rpc.initialize({
        accounts: {
          initialAccount: pda,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signer: [provider.wallet.publicKey],
      });
      console.log(
        'Created new myAccount w/ address:',
        provider.wallet.publicKey.toBase58()
      );
      setIsInitialized(true); // Set initialization state to true
    } else {
      const account = await program.account.init.fetch(pda);
      console.log('Retrieved existing account data:', account);
      await Retrieve();
      setIsInitialized(true); // Set initialization state to true
    }
  } catch (error) {
    console.log('ERROR IN CREATING/INITIALIZING ACCOUNT', error);
    setRetrieveValue(null);
  }
}


const onInputChange = (event) =>{
  const {value}= event.target
  setInputValue(value)
}

const UpdateValue = async () =>{
  try{
    const provider = getProvider()
    const program = new anchor.Program(idl, programID, provider)
    const value = inputValue
    const [pda, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [utf8.encode('initial-account'), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    let tx2 = await program.rpc.updateValue(value,{
      accounts: {
        user: provider.wallet.publicKey,
        initialAccount: pda,
      },
    })
  }catch (error){
    console.log('ERROR IN UPDATING THE VALUE', error)

  }
  
}


  return (
    <div className="App">
      <header className="App-header">
        {!isConnected && (
        <div>
          <button className='btn' onClick={checkWalletConnection}>
            Connect Wallet
          </button>
        </div>
        )}
        {isConnected && !isInitialized && (
          <div>
            <p>
              Connected Account :{' '}
              <span className='address'>{walletAddress}</span>
            </p>
            <div className="grid-item">
              <button className='btn2' onClick={CreateAccount}>Initialize</button>
              <button className='btn2' onClick={disconnectWallet}>Disconnect Wallet</button>
            </div>
          </div>
        )}
        {isInitialized && (
        <div>
          <p>
            Connected Account :{' '}
            <span className='address'>{walletAddress}</span>
          </p>
          
          <div className="grid-item">
            <p>{retrieveValue}</p>
            <input placeholder="Can you write some for me?" value = {inputValue} onChange={onInputChange}></input>
            <button className="btn2" onClick={UpdateValue}>Store</button>
            <button className="btn2" onClick={Retrieve}>Retrieve</button>
            <button className='btn2' onClick={disconnectWallet}>Disconnect Wallet</button>
            </div>
          

        </div>
      )}
      </header>
    </div>
  );
}

export default App;
