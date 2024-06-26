import { useEffect, useState } from 'react'
import Button from './components/Button'
import TextArea from './components/TextArea'
import Icon from './components/Icon'
import Papa from 'papaparse'
import { generateImage, refineDescrition } from './assets/lib/api'
import Loader from './components/Loader'

const imageStyles = [
  'Portrait',
  'Digital Art',
  'Landscape',
  'Abstract',
  'Realism',
  'Impressionism',
  'Expressionism',
  'Minimalism',
  'Pop Art',
  'Surrealism'
]

function App(): JSX.Element {
  const defaultImage = 'src/assets/image-icon.png'

  const [inputs, setInputs] = useState([{ id: 1, text: '', imageUrl: defaultImage }])

  const [selectedStyle, setSelectedStyle] = useState('') // State to store the selected style

  const [selectedGPT, setSelectedGPT] = useState('gpt-4') // State to store the selected style

  const [selectedDALLE, setSelectedDALLE] = useState('dall-e-3') // State to store the selected style

  const [refineLoading, setRefineLoading] = useState(false)

  const [generating, setGenerating] = useState(false)

  const [downloading, setIsDownloading] = useState(false)

  const [error, setError] = useState('')

  const handleStyleChange = (event) => {
    setSelectedStyle(event.target.value) // Update the selected style when the dropdown value changes
  }

  const handleGPTChange = (event) => {
    setSelectedGPT(event.target.value) // Update the selected style when the dropdown value changes
  }
  const handleDALLEChange = (event) => {
    setSelectedDALLE(event.target.value) // Update the selected style when the dropdown value changes
  }

  const addMore = () => {
    setInputs([...inputs, { id: inputs.length + 1, text: '', imageUrl: defaultImage }])
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]

    Papa.parse(file, {
      header: false, // No header since we just want the data rows
      complete: (result) => {
        const parsedData = result.data.map((row, index) => ({
          id: index + 1,
          text: row[0] || '', // Assumes the first column contains the text
          imageUrl: defaultImage // Default image URL if needed
        }))
        setInputs(parsedData)
      },
      error: (error) => {
        console.error('Error while parsing CSV:', error)
        setError('An error occured! Please try again with other file!')
      }
    })
  }

  const handleInputChange = (id: number, newText: string) => {
    setInputs(inputs.map((input) => (input.id === id ? { ...input, text: newText } : input)))
  }

  const handleGenerateImage = async () => {
    setGenerating(true)
    try {
      const updatedInputs = [...inputs] // Create a copy of the inputs array

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i]

        if (!input.text.trim()) {
          continue // Skip empty texts
        }

        const prompt = createPrompt(input.text)

        try {
          const imageUrl = await generateImage(prompt, selectedDALLE)
          updatedInputs[i] = { ...input, imageUrl: imageUrl }
          setInputs([...updatedInputs]) // Update state with the new image URL
          setError('')
        } catch (error) {
          console.error(`Error generating image for input ${i}:`, error)
          setError('An error occured! Skipping this image')
          // Optionally, you can set some default image URL or leave it empty
          updatedInputs[i] = { ...input, imageUrl: defaultImage }
        }

        await new Promise((resolve) => setTimeout(resolve, 1000)) // Add a 1 second delay between each request
      }
    } catch (error) {
      console.error('Error generating images:', error)
      setError('An error occurred! Please try again!')
    } finally {
      setGenerating(false)
    }
  }

  const createPrompt = (input: string) => {
    const styleText = selectedStyle ? ` The art style should be ${selectedStyle}.` : ''
    return `${input.trim()}.${styleText}`
  }

  const handleRefineDescription = async () => {
    try {
      setRefineLoading(true)
      const updatedInputs = await Promise.all(inputs.map(refineInput))
      setInputs(updatedInputs)
    } catch (error) {
      console.error('Error refining descriptions:', error)
      setError('An error occured! Please try again!')
    } finally {
      setRefineLoading(false)
    }
  }

  const handleDeleteRow = (id: number) => {
    setInputs(inputs.filter((input) => input.id !== id))
  }

  const handleResetAll = () => {
    setInputs([{ id: 1, text: '', imageUrl: defaultImage }])
  }

  const refineInput = async (input) => {
    if (!input.text.trim()) {
      // If the text is empty or just whitespace, return the input as is
      return input
    }

    const prompt = createPrompt(input.text)
    console.log(prompt)
    const refinedText = await refineDescrition(prompt, selectedGPT)
    return { ...input, text: refinedText }
  }

  function truncatePrompt(input: string): string {
    // Split the input string into words
    const words = input.split(' ')

    // Take the first 10 words
    const truncatedWords = words.slice(0, 4)

    // Join the words back into a single string without spaces
    const truncatedString = truncatedWords.join('')

    return truncatedString
  }

  const downloadImage = async (imageUrl: string, prompt: string) => {
    try {
      setIsDownloading(true)

      prompt = truncatePrompt(prompt)

      if (!window) return
      window.api.downloadImage(imageUrl, prompt)
      window.api.onDownloadComplete((event, downloadPath) => {
        setIsDownloading(false)
        console.log(event)
        alert(`Image downloaded to: ${downloadPath}`)
      })
      window.api.onDownloadError((event, errorMessage) => {
        setIsDownloading(false)
        console.log(event)
        alert(`Failed to download image: ${errorMessage}`)
      })
    } catch (error) {
      setIsDownloading(false)
      console.error('Error downloading image:', error)
      setError('An error occured! Please try again!')
    }
  }

  const downloadAllImages = async () => {
    try {
      setIsDownloading(true)

      if (!window) return

      // Filter out inputs with the default image URL and map to the format expected by downloadImages
      const images = inputs
        .filter((input) => input.imageUrl !== defaultImage)
        .map((input) => ({
          imageUrl: input.imageUrl,
          prompt: input.text // Assuming 'text' is used as the 'prompt' here
        }))

      // Send all image URLs and prompts to the Electron main process
      window.api.downloadImages(images)

      window.api.onDownloadComplete((event, downloadPaths) => {
        setIsDownloading(false)
        console.log(event)
        alert(`Images downloaded to: ${downloadPaths.join(', ')}`)
      })

      window.api.onDownloadError((event, errorMessage) => {
        setIsDownloading(false)
        console.log(event)
        alert(`Failed to download images: ${errorMessage}`)
      })
    } catch (error) {
      setIsDownloading(false)
      console.error('Error downloading images:', error)
      setError('An error occurred! Please try again!')
    }
  }

  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleContextMenu = (e, imageUrl) => {
    e.preventDefault()

    try {
      window.api.showContextMenu(imageUrl)
    } catch (error) {
      console.log(error)
    }
  }

  const [mounted, setMounted] = useState(true)

  useEffect(() => {
    const handleImageCopied = () => {
      console.log('Image copied!')
      if (mounted) {
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      }
    }

    const handleImageCopying = () => {
      console.log('Image copying!')
      if (mounted) {
        setCopying(true)
        setTimeout(() => setCopying(false), 4000)
      }
    }

    // Subscribe to events
    window.api.onImageCopied(handleImageCopied)
    window.api.onImageCopying(handleImageCopying)

    // Cleanup function
    return () => {
      // Set mounted to false to prevent state updates after unmounting
      setMounted(false)
    }
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="max-w-screen-lg mx-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            {inputs.map((input, index) => (
              <div key={input.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 group">
                <div className="relative flex items-center">
                  <button
                    className="text-red-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:absolute md:left-[calc(-1*30px)] md:top-0"
                    onClick={() => handleDeleteRow(input.id)}
                  >
                    ❌
                  </button>
                  <TextArea
                    key={index}
                    placeholder="Enter text here"
                    value={input.text}
                    onChange={(e) => handleInputChange(input.id, e.target.value)}
                  />
                </div>
                <div className="w-full h-48 bg-gray-100 relative flex items-center justify-center group">
                  {input.imageUrl === defaultImage ? (
                    <span className="flex items-center justify-center relative">
                      <Icon />
                    </span>
                  ) : (
                    <>
                      <div className="absolute z-10 bottom-[40%] flex space-x-2">
                        <button
                          color="black"
                          className="h-10 text-xs border-slate-200 bg-white text-green-500 font-semibold opacity-0 transition-opacity duration-200 group-hover:opacity-100 inline-flex items-center justify-center whitespace-nowrap border rounded px-4 py-2"
                          disabled={false}
                          onClick={() => downloadImage(input.imageUrl, input.text)}
                        >
                          {downloading ? (
                            <span>
                              <Loader color="white" /> Downloading image...
                            </span>
                          ) : (
                            'Download'
                          )}
                        </button>
                      </div>

                      <img
                        alt="Generated"
                        src={input.imageUrl}
                        className="w-full h-full object-cover group-hover:opacity-80"
                        onContextMenu={(e) => handleContextMenu(e, input.imageUrl)}
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
            <Button color="white" className="w-full" onClick={addMore} disabled={false}>
              + Add More
            </Button>

            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Upload CSV
            </label>
            <input
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50  focus:outline-none   "
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
            />
          </div>
          <div className="space-y-4">
            <select
              onChange={handleStyleChange}
              className=" bg-white border border-slate-200 text-gray-900 text-sm rounded-md focus:ring-black focus:border-black block w-full px-4 py-2"
            >
              <option value="">Select Art Style</option>

              {imageStyles.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>

            <div className="flex space-x-2">
              <select
                onChange={handleGPTChange}
                className=" bg-white border border-slate-200 text-gray-900 text-sm rounded-md focus:ring-black focus:border-black block w-full px-4 py-2"
              >
                <option value={'gpt-4'}>GPT-4</option>
                <option value={'gpt-3.5-turbo'}>GPT-3.5 Turbo</option>
              </select>

              <select
                onChange={handleDALLEChange}
                className=" bg-white border border-slate-200 text-gray-900 text-sm rounded-md focus:ring-black focus:border-black block w-full px-4 py-2"
              >
                <option value={'dall-e-3'}>DALL-E 3</option>
                <option value={'dall-e-2'}>DALL-E 2</option>
              </select>
            </div>

            <Button
              color="black"
              className="w-full"
              disabled={generating}
              onClick={() => handleGenerateImage()}
            >
              {generating ? (
                <span>
                  <Loader color="black" /> Generating Images...
                </span>
              ) : (
                'Generate Images'
              )}
            </Button>

            <Button
              color="white"
              className="w-full"
              onClick={handleRefineDescription}
              disabled={refineLoading}
            >
              {refineLoading ? (
                <span>
                  <Loader color="white" /> Refining Descriptions...
                </span>
              ) : (
                'Refine Description'
              )}
            </Button>

            <Button
              color="white"
              className="w-full"
              onClick={downloadAllImages}
              disabled={downloading}
            >
              {downloading ? (
                <span>
                  <Loader color="white" /> Downloading...
                </span>
              ) : (
                'Download All Images'
              )}
            </Button>

            <Button color="white" className="w-full" onClick={handleResetAll} disabled={false}>
              ❌ Reset All
            </Button>

            {error && <p className="text-red-400 text-sm font-semibold text-center">{error}</p>}
            {copying && (
              <p className="text-sm font-semibold text-center">
                Copying image! Please wait for a few seconds
              </p>
            )}

            {copied && (
              <div className="text-sm font-semibold text-center text-green-500">
                <p>Image copied!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
