#!/usr/bin/env node
/**
 * Generate 100 Activation Codes
 * Each code:
 *   - One-time use only
 *   - Valid for 1 month (30 days) from activation
 *   - Tied to one device
 *   - Format: ALFA-XXXX-XXXX (uppercase letters + digits)
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Generate random 4-char code (uppercase letters + digits)
function randomCodePart() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // skip confusing chars (I,O,0,1)
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function generateFullCode() {
  return `ALFA-${randomCodePart()}-${randomCodePart()}`
}

async function generateCodes(count = 100) {
  console.log(`\n🎯 Generating ${count} activation codes...\n`)
  console.log('Code              | Status   | Created At')
  console.log('─'.repeat(60))

  const codes = []
  let attempts = 0
  const maxAttempts = count * 5

  while (codes.length < count && attempts < maxAttempts) {
    attempts++
    const code = generateFullCode()

    // Skip duplicates in our batch
    if (codes.find(c => c.code === code)) continue

    try {
      // Insert into database
      const created = await prisma.activationCode.create({
        data: {
          code,
          status: 'unused',
        }
      })
      codes.push(created)
      console.log(`${created.code} | unused   | ${new Date().toISOString().split('T')[0]}`)
    } catch (e) {
      // Duplicate in DB - skip
      if (e.code === 'P2002') continue
      console.error('Error:', e.message)
      break
    }
  }

  console.log('─'.repeat(60))
  console.log(`\n✅ Generated ${codes.length} codes successfully!`)
  console.log(`📁 Codes saved to database (ActivationCode table)`)

  // Save to file as backup
  const fs = require('fs')
  const path = require('path')
  const filePath = path.join('/home/z/my-project/download', `activation-codes-${Date.now()}.txt`)
  fs.writeFileSync(filePath, codes.map(c => c.code).join('\n'))
  console.log(`📋 Backup saved to: ${filePath}`)

  return codes
}

// Run with optional count argument
const count = parseInt(process.argv[2] || '100', 10)
generateCodes(count)
  .catch(console.error)
  .finally(() => prisma.$disconnect())
