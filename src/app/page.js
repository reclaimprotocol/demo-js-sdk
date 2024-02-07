"use client";

import { useState, useEffect, useRef } from 'react';
import { ReclaimClient } from '@reclaimprotocol/js-sdk'
import QRCode from "react-qr-code";

export default function Home() {
  const [url, setUrl] = useState('')
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

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
    const APP_ID = process.env.NEXT_PUBLIC_APP_ID
    const APP_SECRET = process.env.NEXT_PUBLIC_APP_SECRET

    const reclaimClient = new ReclaimClient(APP_ID);
    const providers = ['1bba104c-f7e3-4b58-8b42-f8c0346cdeab'];
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
    console.log(url);
    reclaimReq.on('success', (data) => {
      if (data) {
        const proofs = data
        console.log('proofs', proofs)
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8 mt-8 gap-4">
      <div className="z-10 w-full flex flex-col gap-4 items-center justify-center font-mono text-sm">
        <h2 className="text-sm lg:text-4xl md:text-3xl sm:text-xl xs:text-xs text-nowrap">Welcome to Reclaim Protocol Demo</h2>
        <button className="bg-blue-500 mt-8 hover:bg-blue-700 lg:text-lg md:text-base sm:text-lg text-white font-semibold py-2 px-4 rounded"
          onClick={handleButtonClick}
        >Generate Proof</button>
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
      </div>

    </main>
  );
}
