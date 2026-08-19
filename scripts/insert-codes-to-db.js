/**
 * Insert the 100 generated codes into the database
 */
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function insertCodes() {
  // Find the latest generated codes file
  const downloadDir = '/home/z/my-project/download'
  const files = fs.readdirSync(downloadDir)
    .filter(f => f.startsWith('activation-codes-') && f.endsWith('.txt'))
    .sort()
    .reverse()

  if (files.length === 0) {
    console.error('No activation codes file found')
    process.exit(1)
  }

  const latestFile = files[0]
  const codesPath = path.join(downloadDir, latestFile)
  console.log(`Reading codes from: ${codesPath}`)

  const codesText = fs.readFileSync(codesPath, 'utf-8')
  const codes = codesText.split('\n').filter(c => c.trim())

  console.log(`Found ${codes.length} codes to insert\n`)

  let inserted = 0
  let skipped = 0
  for (const code of codes) {
    try {
      await prisma.activationCode.create({
        data: {
          code: code.trim(),
          status: 'unused',
        }
      })
      inserted++
      if (inserted % 10 === 0) {
        console.log(`  Inserted ${inserted}/${codes.length}...`)
      }
    } catch (e) {
      if (e.code === 'P2002') {
        skipped++
      } else {
        console.error(`Error inserting ${code}:`, e.message)
      }
    }
  }

  console.log(`\n✅ Done! Inserted: ${inserted}, Skipped (duplicates): ${skipped}`)

  // Count total in DB
  const total = await prisma.activationCode.count()
  console.log(`📊 Total codes in database: ${total}`)

  const unused = await prisma.activationCode.count({ where: { status: 'unused' } })
  console.log(`📋 Unused codes: ${unused}`)
}

insertCodes()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
