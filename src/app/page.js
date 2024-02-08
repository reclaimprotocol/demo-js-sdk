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

  const reclaimClient = new ReclaimClient(APP_ID);

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
      const providers = await reclaimClient.getMyProvidersList()
      setMyProviders(providers)
      setSelectedProviderId(providers[0].httpProviderId)
      setSelectedProvider(providers[0])
    }
    fetchProviders()
  }, [])

  useEffect(() => {
    if (proofs) {
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
      }, 5000); // 10 seconds
    }
  }, [proofs]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8 mt-8 gap-4 bg-black">
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

        <button className="bg-blue-500 mt-8 hover:bg-blue-700 lg:text-lg md:text-base sm:text-lg text-gray-200 font-semibold py-2 px-4 rounded"
          onClick={handleButtonClick}
        >Generate Proof Of Ownership Of {selectedProvider.name} </button>
        {showQR && (
          <>
          <span className='text-gray-300'>
          <button onClick={copyToClipboard} className="border-gray-500 border-2 mt-8 px-2 hover:bg-gray-300 text-gray-400 font-semibold rounded shadow">
                  {isCopied ? 'Copied!' : 'Copy Link'}</button> and open it in your mobile browser </span>
            {!isMobileDevice && (
              <>
                <p className='text-gray-300'>Or scan the QR code</p>
                <input ref={urlRef} value={url} readOnly style={{ opacity: 0, position: 'absolute', zIndex: -1 }} />
                {/* <button onClick={copyToClipboard} className="border-gray-500 border-2 px-2 hover:bg-gray-300 font-semibold rounded shadow">
                  {isCopied ? 'Copied!' : 'Copy Link'}</button> */}
                <div style={{ border: '16px solid white' }}>
                  <QRCode value={url} />
                </div>

              </>
            )
            }
            {isMobileDevice && (
              <>
                <p className="mt-8 lg:text-lg text-gray-400">Or click on `Open Link` button below to generate proof</p>
                <button onClick={() => window.open(url, "_blank")} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Open Link</button>
              </>
            )}

          </>
        )}
        {
          proofs && (
            <>
              <h3 className="text-slate-300 text-sm lg:text-2xl md:text-xl sm:text-lg xs:text-xs mt-8">Proofs Received</h3>
              {proofs.map((proof, index) => {
                const objKeys = Object.keys(proof.extractedParameterValues)
                const objValues = Object.values(proof.extractedParameterValues)
                return (
                <div key={index} className="flex flex-col gap-2 text-wrap justify-center items-center">
                  <pre className='text-wrap text-slate-400'>{objKeys.map((key, index) => {
                    return `${key}: ${objValues[index]}`
                  }).join('\n')}</pre>
                  {/* <code className='whitespace-pre-wrap'>{JSON.stringify(proof, null, 2)}</code> */}
                </div>
              )})}
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


// [
//   {
//       "identifier": "0x7aa78bb5850caa606c29259a89336339ccdc164703410a44d8b917652a876598",
//       "claimData": {
//           "provider": "http",
//           "parameters": "{\"body\":\"\",\"geoLocation\":\"\",\"method\":\"GET\",\"responseMatches\":[{\"type\":\"contains\",\"value\":\"\\\"restaurant_name\\\":\\\"MOJO Pizza - 2X Toppings\\\"\"},{\"type\":\"contains\",\"value\":\"\\\"name\\\":\\\"Italian Stuffed Garlic Bread + Cheesy Dip [FREE]\\\"\"},{\"type\":\"contains\",\"value\":\"\\\"category_details\\\":{\\\"category\\\":\\\"Garlic Breads + Cheesy Dip [FREE]\\\",\\\"sub_category\\\":\\\"nota\\\"}\"},{\"type\":\"contains\",\"value\":\"\\\"order_total\\\":1311\"}],\"responseRedactions\":[{\"jsonPath\":\"$.data.orders[0].restaurant_name\",\"regex\":\"\\\"restaurant_name\\\":\\\"(.*)\\\"\",\"xPath\":\"\"},{\"jsonPath\":\"$.data.orders[0].order_items[0].name\",\"regex\":\"\\\"name\\\":\\\"(.*)\\\"\",\"xPath\":\"\"},{\"jsonPath\":\"$.data.orders[0].order_items[0].category_details\",\"regex\":\"\\\"category_details\\\":(.*)\",\"xPath\":\"\"},{\"jsonPath\":\"$.data.orders[0].order_total\",\"regex\":\"\\\"order_total\\\":(.*)\",\"xPath\":\"\"}],\"url\":\"https://www.swiggy.com/dapi/order/all?order_id=\"}",
//           "owner": "0xbbbc1ae2faf210b15a6c0be049500583fc3d94e2",
//           "timestampS": 1707411277,
//           "context": "{\"contextAddress\":\"0x0\",\"contextMessage\":\"\"}",
//           "identifier": "0x7aa78bb5850caa606c29259a89336339ccdc164703410a44d8b917652a876598",
//           "epoch": 2
//       },
//       "signatures": [
//           "0x476b204fc6b1c6fc76760eb48b954b155561bf0cc2627b370e1883c8e33c21a01b70bc7ef51473c6bd74fd56b39b20d754314b354a34e8e95415fa63bddc310e1c"
//       ],
//       "witnesses": [
//           {
//               "id": "0x244897572368eadf65bfbc5aec98d8e5443a9072",
//               "url": "https://reclaim-node.questbook.app"
//           }
//       ],
//       "extractedParameterValues": {
//           "restaurant_1": "MOJO Pizza - 2X Toppings",
//           "restaurant_1_order_item_name": "Italian Stuffed Garlic Bread + Cheesy Dip [FREE]",
//           "restaurant_1_order_category": "{\"category\":\"Garlic Breads + Cheesy Dip [FREE]\",\"sub_category\":\"nota\"}",
//           "amount_paid": "1311"
//       }
//   }
// ]