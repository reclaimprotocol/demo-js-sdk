"use client";

import { useState, useEffect, useRef } from 'react';
import { ReclaimClient } from '@reclaimprotocol/js-sdk'
import QRCode from "react-qr-code";
import Confetti from 'react-confetti'
import useWindowSize from 'react-use/lib/useWindowSize'

const APP_ID = process.env.NEXT_PUBLIC_APP_ID
const APP_SECRET = process.env.NEXT_PUBLIC_APP_SECRET

export default function Home() {
  const [url, setUrl] = useState('')
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false);

  const [myProviders, setMyProviders] = useState([])

  const [selectedProvider, setSelectedProvider] = useState(myProviders[0] || {})

  const [selectedProviderId, setSelectedProviderId] = useState(myProviders[0]?.httpProviderId || '')


  const [proofs, setProofs] = useState()

  const { width, height } = useWindowSize()

  const urlRef = useRef(null);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      console.log('Link copied to clipboard');
    } catch (err) {
      console.error('Failed to copy link: ', err);
    }
  };

  const getVerificationReq = async () => {

    const reclaimClient = new ReclaimClient(APP_ID);
    const providers = [selectedProviderId];
    const providerV2 = await reclaimClient.buildHttpProviderV2ByID(
      providers
    )
    const requestProofs = reclaimClient.buildRequestedProofs(
      providerV2,
      reclaimClient.getAppCallbackUrl()
    )
    console.log('callback', reclaimClient.getAppCallbackUrl())
    reclaimClient.setSignature(
      await reclaimClient.getSignature(requestProofs, APP_SECRET)
    )
    const reclaimReq = await reclaimClient.createVerificationRequest(providers)
    console.log('req', reclaimReq.template)
    const url = await reclaimReq.start()
    setUrl(url)
    setShowQR(true)
    reclaimReq.on('success', (data) => {
      if (data) {
        const proofs = data
        console.log('proofs', proofs)
        setProofs(proofs)
        setShowQR(false)
        // TODO: update business logic based on successful proof
      }
    })
    reclaimReq.on('error', (data) => {
      if (data) {
        const proofs = data
        console.log('proofs', proofs)
        // TODO: update business logic based on proof generation failure
      }
    })
  }

  const handleButtonClick = () => {
    setIsCopied(false)
    setProofs(null)
    getVerificationReq()
  }

  useEffect(() => {
    let details = navigator.userAgent;
    let regexp = /android|iphone|kindle|ipad/i;

    let isMobileDevice = regexp.test(details);

    if (isMobileDevice) {
      setIsMobileDevice(true)
    } else {
      setIsMobileDevice(false)
    }

  }, [])

  useEffect(() => {

    // fetch providers
    const fetchProviders = async () => {
      const res = await fetch(`https://api.reclaimprotocol.org/v2/app-http-providers/${APP_ID}`)
      const data = await res.json()
      setMyProviders(data.result.providers)
      setSelectedProviderId(data.result.providers[0].httpProviderId)
      setSelectedProvider(data.result.providers[0])
    }
    console.log('myProviders', myProviders)
    fetchProviders()
  }, [])

  useEffect(() => {
    console.log('my providers', myProviders)
  }, [myProviders])

  useEffect(() => {
    if (proofs) {
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
      }, 5000); // 10 seconds
    }
  }, [proofs]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8 mt-8 gap-4">
      <div className="z-10 w-full flex flex-col gap-4 items-center justify-center font-mono text-sm">
        <h2 className="text-slate-300 text-sm lg:text-4xl md:text-3xl sm:text-xl xs:text-xs text-nowrap">Welcome to Reclaim Protocol Demo</h2>
        <h4 className="text-slate-400 text-sm lg:text-xl md:text-lg sm:text-lg xs:text-xs">This demo uses <span className="text-slate-300"><a href='https://www.npmjs.com/package/@reclaimprotocol/js-sdk'> @reclaimprotocol/js-sdk </a></span> to generate proofs of your web2 data</h4>

        <select value={selectedProviderId} onChange={(e) => {
          setSelectedProviderId(e.target.value)
          setSelectedProvider(myProviders.find(provider => provider.httpProviderId === e.target.value))
          }} 
          className="max-w-fit px-3 py-2 text-black bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
          {myProviders.map((provider, index) => (
            <option key={index} value={provider.httpProviderId}>
              {provider.name}
            </option>
          ))}
        </select>

        <button className="bg-blue-500 mt-8 hover:bg-blue-700 lg:text-lg md:text-base sm:text-lg text-white font-semibold py-2 px-4 rounded"
          onClick={handleButtonClick}
        >Generate Proof Of Ownership Of {selectedProvider.name} </button>
        {showQR && (
          <>
            {!isMobileDevice && (
              <>
                <p>Scan the QR code or</p>
                <input ref={urlRef} value={url} readOnly style={{ opacity: 0, position: 'absolute', zIndex: -1 }} />
                <button onClick={copyToClipboard} className="border-gray-500 border-2 px-2 hover:bg-gray-300 font-semibold rounded shadow">
                  {isCopied ? 'Copied!' : 'Copy Link'}</button>
                <QRCode value={url} />
              </>
            )
            }
            {isMobileDevice && (
              <>
                <p className="mt-8 lg:text-lg">Click on `Open Link` button below to generate proof</p>
                <button onClick={() => window.open(url, "_blank")} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Open Link</button>
              </>
            )}

          </>
        )}
        {
          proofs && (
            <>
              <h3 className="text-slate-300 text-sm lg:text-2xl md:text-xl sm:text-lg xs:text-xs mt-8">Proofs Received</h3>
              {proofs.map((proof, index) => (
                <div key={index} className="flex flex-col gap-2 text-wrap justify-center items-center">
                  <pre className='text-wrap text-slate-400'>{JSON.stringify(proof.extractedParameterValues)}</pre>
                  {/* <code className='whitespace-pre-wrap'>{JSON.stringify(proof, null, 2)}</code> */}
                </div>
              ))}
              {showConfetti && (
                <Confetti
                  width={width}
                  height={height}
                />
              )}
            </>
          )
        }
      </div>

    </main>
  );
}
