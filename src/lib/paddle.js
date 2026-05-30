const PADDLE_JS_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js'

let paddleLoaded = false

export async function loadPaddle() {
  if (paddleLoaded) return

  const env = import.meta.env.VITE_PADDLE_ENV || 'sandbox'
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN

  if (!token) {
    throw new Error('Paddle client token is not configured.')
  }

  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Paddle) {
      if (env === 'sandbox') {
        window.Paddle.Environment.set('sandbox')
      }
      window.Paddle.Initialize({
        token,
        eventCallback(event) {
          console.log('PADDLE EVENT', event)
        },
      })
      paddleLoaded = true
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = PADDLE_JS_URL
    script.async = true

    script.onload = () => {
      if (!window.Paddle) {
        reject(new Error('Paddle.js failed to initialize.'))
        return
      }
      if (env === 'sandbox') {
        window.Paddle.Environment.set('sandbox')
      }
      window.Paddle.Initialize({
        token,
        eventCallback(event) {
          console.log('PADDLE EVENT', event)
        },
      })
      paddleLoaded = true
      resolve()
    }

    script.onerror = () => {
      reject(new Error('Failed to load Paddle.js. Check your network or ad blocker.'))
    }

    document.head.appendChild(script)
  })
}

export async function openPaddleCheckout({ priceId, user }) {
  const env = import.meta.env.VITE_PADDLE_ENV || 'sandbox'

  // Validate priceId
  if (!priceId) {
    throw new Error('Missing Paddle price ID')
  }

  // Resolve safe email
  const safeEmail =
    user?.email ||
    user?.user_metadata?.email ||
    user?.identities?.[0]?.identity_data?.email ||
    null

  // Resolve safe user id
  const safeUserId = user?.id || null

  // Diagnostic log
  console.log('Paddle Checkout diagnostics:', {
    env,
    priceId,
    priceId_empty: !priceId,
    has_user: !!user,
    has_user_id: !!safeUserId,
    has_user_email: !!safeEmail,
    safeEmail,
    user_email_raw: user?.email,
    user_metadata_email: user?.user_metadata?.email,
    identity_email: user?.identities?.[0]?.identity_data?.email,
  })

  if (!safeUserId) {
    throw new Error('Missing user id for Paddle checkout')
  }

  if (!safeEmail) {
    throw new Error('Missing user email for Paddle checkout')
  }

  await loadPaddle()

  const checkoutPayload = {
    items: [{ priceId, quantity: 1 }],
    customer: {
      email: safeEmail,
    },
    customData: {
      user_id: safeUserId,
      email: safeEmail,
      plan: 'pro',
    },
  }

  console.log('PADDLE OPEN', checkoutPayload)

  let checkout
  try {
    checkout = window.Paddle.Checkout.open(checkoutPayload)
  } catch (err) {
    console.error('PADDLE OPEN ERROR', err)
    throw err
  }

  if (checkout && typeof checkout.on === 'function') {
    checkout.on('error', (err) => {
      console.error('PADDLE CHECKOUT ERROR EVENT', err)
    })
  }

  console.log('Paddle checkout opened', { priceId, email: safeEmail })
  return checkout
}
