export async function refineDescrition(prompt: string, model: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: `${prompt}` }]
      })
    })

    const data = await response.json()
    const completion = data.choices[0].message.content
    return completion
  } catch (error) {
    console.error('Error:', error)
  }
}

const DALLE_API = 'https://api.openai.com/v1/images/generations'

export const generateImage = async (prompt, model: string) => {
  let data: any

  if (model == 'dall-e-3') {
    data = JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1792x1024',
      quality: 'hd'
    })
  } else if (model == 'dall-e-2') {
    data = JSON.stringify({
      model: 'dall-e-2',
      prompt: prompt,
      n: 1,
      size: '1024x1024'
    })
  } else {
    return
  }

  const headers = new Headers({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_API_KEY}`
  })

  try {
    const response = await fetch(DALLE_API, {
      method: 'POST',
      body: data,
      headers: headers
    })
    const result = await response.json()
    if (result.data && result.data.length > 0) {
      return result.data[0].url
    } else {
      throw new Error('No URL found in the response')
    }
  } catch (error) {
    console.error('Error generating image:', error)
    throw error // Re-throw the error to be handled by the caller
  }
}
