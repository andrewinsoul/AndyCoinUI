/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { ethers, utils } from "ethers";
import { Modal } from "./components/Modal";
import Loader from "./components/Loader";
import abi from "./contracts/AndyCoin.json";

function App() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [inputValue, setInputValue] = useState({
    walletAddress: "",
    transferAmount: "",
    burnAmount: "",
    mintAmount: "",
  });
  const [tokenName, setTokenName] = useState("Acoin");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenTotalSupply, setTokenTotalSupply] = useState(0);
  const [isTokenOwner, setIsTokenOwner] = useState(false);
  const [tokenOwnerAddress, setTokenOwnerAddress] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [, setGettingTokenInfo] = useState(false);
  const [transferingToken, setTransferingToken] = useState(false);
  const [appLoading, setAppLoading] = useState(false);
  const [burningToken, setBurningToken] = useState(false);
  const [mintingToken, setMintingToken] = useState(false);
  const [modalHeader, setModalHeader] = useState("");
  const [modalBody, setModalBody] = useState("");
  const [modalType, setModalType] = useState("error"); // could either be error or success

  const [yourWalletAddress, setYourWalletAddress] = useState(null);

  const contractAddress = "0x8b185cE9B81A4ccD69F64b441986eD3c850A05A6";
  const contractABI = abi.abi;

  /**
   * @description: This function displays the error modal with heading and body when an error occurs in any operation
   * @param {String} errorHeader - The error heading that will be displayed in the error modal
   * @param {String} errorBody - The error body that wil be displayed in the error modal
   */
  const displayError = (errorHeader, errorBody = "An error occured") => {
    setModalType("error");
    setShowModal(true);
    setModalHeader(errorHeader);
    setModalBody(errorBody);
  };

  /**
   * @description: This function displays the success modal with heading and body when an operation is successful
   * @param {String} header - The heading that will be displayed in the success modal
   * @param {String} body - The body that wil be displayed in the success modal
   */
  const displaySuccess = (
    header = "Transaction Success",
    body = "Your transaction was successful"
  ) => {
    setModalType("success");
    setShowModal(true);
    setModalHeader(header);
    setModalBody(body);
  };

  /**
   * @description - gets the contract, the provider and the signer
   * @param {Boolean} shouldUseProvider - An argument that controls whether to use the provider or the signer (We use the provider if the transaction is not going to change state but the signer is used if there will be a state change in the transaction)
   * @returns {Object} - Returns an object with the contract, the provider and the signer
   */
  const getContract = async (shouldUseProvider = false) => {
    try {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          contractAddress,
          contractABI,
          shouldUseProvider ? provider : signer
        );
        return { contract, provider, signer };
      } else {
        const errorBody = "Install Metamask to use our crypto bank...";
        displayError("Metamask not installed", errorBody);
      }
    } catch (error) {
      throw error;
    }
  };

  const checkIfWalletIsConnected = async () => {
    try {
      if (window.ethereum) {
        const [account] = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setIsWalletConnected(true);
        setYourWalletAddress(account);
        console.log("Account Connected: ", account);
        return { success: true };
      } else {
        const errorBody = "Install Metamask to use our crypto bank...";
        const errorHeader = "Metamask not installed";
        displayError(errorHeader, errorBody);
      }
    } catch (error) {
      displayError("Error", "An error occured while loading the application");
    }
  };

  const checkEvents = (contract, callBackFn, nameOfEvent) => {
    contract.on(nameOfEvent, callBackFn);
  };

  const getTokenInfo = async () => {
    try {
      setGettingTokenInfo(true);
      const { contract: tokenContract } = await getContract(true);
      let tokenName = await tokenContract.name();
      let tokenSymbol = await tokenContract.symbol();
      let tokenOwner = await tokenContract.owner();
      let tokenSupply = await tokenContract.totalSupply();
      tokenSupply = utils.formatEther(tokenSupply);
      const [account] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setTokenName(`${tokenName} 🦊`);
      setTokenSymbol(tokenSymbol);
      setTokenTotalSupply(tokenSupply);
      setTokenOwnerAddress(tokenOwner);

      if (account.toLowerCase() === tokenOwner.toLowerCase()) {
        setIsTokenOwner(true);
      }

      console.log("Token Name: ", tokenName);
      console.log("Token Symbol: ", tokenSymbol);
      console.log("Token Supply: ", tokenSupply);
      console.log("Token Owner: ", tokenOwner);
    } catch (error) {
      console.log(error);
      const errorBody =
        (error.error && error.error.message) ||
        error.message ||
        "An error occured";
      const errorHeader = "Transaction Error";
      displayError(errorHeader, errorBody);
    } finally {
      setGettingTokenInfo(false);
    }
  };

  const transferToken = async () => {
    setTransferingToken(true);
    const isValidAmount = validateInput("transferAmount");
    const isValidAddress = validateInput("walletAddress");
    if (!isValidAddress) {
      return;
    }
    if (!isValidAmount) {
      return;
    }
    try {
      const { contract: tokenContract } = await getContract();
      const txn = await tokenContract.transfer(
        inputValue.walletAddress,
        utils.parseEther(inputValue.transferAmount)
      );
      console.log("Transfering tokens...");
      await txn.wait();
      console.log("Tokens Transfered", txn.hash);
      checkEvents(
        tokenContract,
        () => {
          setTransferingToken(false);
          setInputValue((prevFormData) => ({
            ...prevFormData,
            walletAddress: "",
            transferAmount: "",
          }));
          displaySuccess("Success", "The tokens was successfully transferred");
        },
        "Transfer"
      );
    } catch (error) {
      setTransferingToken(false);
      const errorBody =
        (error.error && error.error.message) ||
        error.message ||
        "An error occured";
      displayError("Transaction Error", errorBody);
    }
  };

  const burnTokens = async () => {
    try {
      const isValid = validateInput("burnAmount");
      if (!isValid) {
        return;
      }
      setBurningToken(true);
      const { contract: tokenContract } = await getContract();
      const txn = await tokenContract.burn(
        utils.parseEther(inputValue.burnAmount)
      );
      console.log("Burning tokens...");
      await txn.wait();
      console.log("Tokens burned...", txn.hash);

      let tokenSupply = await tokenContract.totalSupply();
      tokenSupply = utils.formatEther(tokenSupply);
      setTokenTotalSupply(tokenSupply);
      checkEvents(
        tokenContract,
        () => {
          displaySuccess("Success", "Operation was successful");
          setBurningToken(false);
          setInputValue((prevFormData) => ({
            ...prevFormData,
            burnAmount: "",
          }));
        },
        "tokensBurned"
      );
    } catch (error) {
      const errorBody =
        (error.error && error.error.message) ||
        error.message ||
        "An error occured";
      displayError("Transaction Error", errorBody);
      setBurningToken(false);
      console.log(error);
    }
  };

  const mintTokens = async (event) => {
    const isValid = validateInput("mintAmount");
    if (!isValid) {
      return;
    }
    try {
      setMintingToken(true);
      const { contract: tokenContract } = await getContract();
      let tokenOwner = await tokenContract.owner();
      const txn = await tokenContract.mint(
        tokenOwner,
        utils.parseEther(inputValue.mintAmount)
      );
      console.log("Minting tokens...");
      await txn.wait();
      console.log("Tokens minted...", txn.hash);

      let tokenSupply = await tokenContract.totalSupply();
      tokenSupply = utils.formatEther(tokenSupply);
      setTokenTotalSupply(tokenSupply);
      checkEvents(
        tokenContract,
        (owner, amount, message) => {
          console.log(owner, amount, message);
          setInputValue((prevFormData) => ({
            ...prevFormData,
            mintAmount: "",
          }));
          displaySuccess("Success", "Operation was successful");
          setMintingToken(false);
        },
        "additionalTokensMinted"
      );
    } catch (error) {
      const errorBody =
        (error.error && error.error.message) ||
        error.message ||
        "An error occured";
      displayError("Transaction Error", errorBody);
      console.log(error);
      setMintingToken(false);
    }
  };

  const handleInputChange = (event) => {
    setInputValue((prevFormData) => ({
      ...prevFormData,
      [event.target.name]: event.target.value,
    }));
  };

  const validateInput = (name) => {
    if (!inputValue[name]) {
      if (name.includes("Amount")) {
        displayError(
          "Error",
          `Please enter the value to ${
            name.split("Amount")[0]
          }, it cannot be empty`
        );
      } else {
        displayError(
          "Error",
          "Please enter the address that will receive the token"
        );
      }
      setTransferingToken(false);
      setBurningToken(false);
      setMintingToken(false);
      return false;
    }
    if (isNaN(Number(inputValue[name]))) {
      displayError("Error", `Please enter a valid amount`);
      setTransferingToken(false);
      setBurningToken(false);
      setMintingToken(false);
      return false;
    }
    return true;
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        setAppLoading(true);
        const isWalletConnectedRes = await checkIfWalletIsConnected();
        const { success, errorBody, errorHeader } = isWalletConnectedRes;
        console.log(success, errorBody, errorHeader);

        if (success) {
          getTokenInfo();
        }
      } catch (error) {
        displayError("Error", "An error occured while loading the app");
      } finally {
        setAppLoading(false);
      }
    };
    fetch();
  }, [isWalletConnected]);

  return (
    <>
      <main className={`main-container ${showModal ? "opacity-20" : ""}`}>
        <h2 className="headline">
          <span className="headline-gradient">Andy Coin </span>
          <img
            className="inline text-sm p-3 ml-2"
            src="https://i.imgur.com/5JfHKHU.png"
            alt="Andy Coin"
            width="60"
            height="30"
          />
        </h2>
        {appLoading ? (
          <section className="customer-section px-10 pt-5 pb-10 h-full flex items-center justify-center">
            <p>Loading</p>
          </section>
        ) : (
          <section className="customer-section px-10 pt-5 pb-10">
            <div className="mt-5">
              <span className="mr-5">
                <strong>Coin:</strong> {tokenName}{" "}
              </span>
              <span className="mr-5">
                <strong>Ticker:</strong> {tokenSymbol}{" "}
              </span>
              <span className="mr-5">
                <strong>Total Supply:</strong> {tokenTotalSupply}
              </span>
            </div>
            <div className="mt-7 mb-9">
              <div className="form-style">
                <input
                  type="text"
                  className="input-double"
                  onChange={handleInputChange}
                  name="walletAddress"
                  placeholder="Wallet Address"
                  value={inputValue.walletAddress}
                />
                <div className="bg-white w-full h-1" />
                <input
                  type="text"
                  className="input-double"
                  onChange={handleInputChange}
                  name="transferAmount"
                  placeholder={`0.0000 ${tokenSymbol}`}
                  value={inputValue.transferAmount}
                />

                <button className="btn-purple" onClick={transferToken}>
                  Transfer Tokens
                  <Loader loading={transferingToken} classStyle="ml-4" />
                </button>
              </div>
            </div>
            {isTokenOwner && (
              <section>
                <div className="mt-10 mb-10">
                  <div className="form-style">
                    <input
                      type="text"
                      className="input-style"
                      onChange={handleInputChange}
                      name="burnAmount"
                      placeholder={`0.0000 ${tokenSymbol}`}
                      value={inputValue.burnAmount}
                    />
                    <button className="btn-purple" onClick={burnTokens}>
                      Burn Tokens
                      <Loader loading={burningToken} classStyle="ml-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-10 mb-10">
                  <div className="form-style">
                    <input
                      type="text"
                      className="input-style"
                      onChange={handleInputChange}
                      name="mintAmount"
                      placeholder={`0.0000 ${tokenSymbol}`}
                      value={inputValue.mintAmount}
                    />
                    <button className="btn-purple" onClick={mintTokens}>
                      Mint Tokens
                      <Loader loading={mintingToken} classStyle="ml-4" />
                    </button>
                  </div>
                </div>
              </section>
            )}
            <div className="mt-5">
              <p>
                <span className="font-bold">Contract Address: </span>
                {contractAddress}
              </p>
            </div>
            <div className="mt-5">
              <p>
                <span className="font-bold">Token Owner Address: </span>
                {tokenOwnerAddress}
              </p>
            </div>
            <div className="mt-5">
              {isWalletConnected && (
                <p>
                  <span className="font-bold">Your Wallet Address: </span>
                  {yourWalletAddress}
                </p>
              )}
              <button
                className="btn-connect"
                onClick={checkIfWalletIsConnected}
              >
                {isWalletConnected
                  ? "Wallet Connected 🔒"
                  : "Connect Wallet 🔑"}
              </button>
            </div>
          </section>
        )}
      </main>
      <Modal
        type={modalType}
        showModal={showModal}
        modalHeader={modalHeader}
        setShowModal={setShowModal}
        modalBody={modalBody}
        modalFooterBtnText={modalHeader === "Error" ? "Close" : "Ok"}
      />
    </>
  );
}
export default App;
