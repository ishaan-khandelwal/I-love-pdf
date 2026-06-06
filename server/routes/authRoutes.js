import express from 'express'
import { supabase } from '../lib/supabase.js'
import crypto from 'crypto'

const router = express.Router()

function hashPassword(password) {
  const salt = 'docloom_salt_12345'
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
}

router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' })
    }

    const hashedPassword = hashPassword(password)

    // Insert user into Supabase 'users' table
    const { data, error } = await supabase
      .from('users')
      .insert({
        full_name: fullName,
        email: email.toLowerCase(),
        password: hashedPassword
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation (email)
        return res.status(400).json({ message: 'Email address is already registered.' })
      }
      return res.status(500).json({ message: 'Signup failed.', error: error.message })
    }

    // Return user info and a session token
    res.status(201).json({
      user: {
        id: data.id,
        fullName: data.full_name,
        email: data.email,
      },
      token: `session-${data.id}-${Date.now()}`
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error during signup.', error: error.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    // Fetch user from Supabase 'users' table
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (error) {
      return res.status(500).json({ message: 'Login query failed.', error: error.message })
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' })
    }

    const hashedPassword = hashPassword(password)
    if (user.password !== hashedPassword) {
      return res.status(400).json({ message: 'Invalid email or password.' })
    }

    res.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
      },
      token: `session-${user.id}-${Date.now()}`
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error during login.', error: error.message })
  }
})

export default router
