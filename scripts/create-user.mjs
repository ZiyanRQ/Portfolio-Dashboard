#!/usr/bin/env node
/**
 * Manage dashboard logins stored (as salted scrypt hashes) in .env.local.
 *
 *   npm run create-user                     add a user or change a password
 *   npm run create-user -- --list           list usernames
 *   npm run create-user -- --remove <name>  remove a user (their sessions end at once)
 *
 * Restart the dev server afterwards so Next.js reloads .env.local.
 */
import { randomBytes, scryptSync } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { createInterface } from "node:readline"

const ENV_FILE = resolve(process.cwd(), ".env.local")
const USERNAME_RE = /^[A-Za-z0-9._-]{2,32}$/
const MIN_PASSWORD = 6

const readLines = () => (existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8").split(/\r?\n/) : [])
const getVar = (lines, key) => lines.find((l) => l.startsWith(`${key}=`))?.slice(key.length + 1) ?? ""
function setVar(lines, key, value) {
  const i = lines.findIndex((l) => l.startsWith(`${key}=`))
  if (i >= 0) lines[i] = `${key}=${value}`
  else lines.push(`${key}=${value}`)
}
const save = (lines) => writeFileSync(ENV_FILE, `${lines.filter((l, i) => l !== "" || i < lines.length - 1).join("\n").trimEnd()}\n`)

function parseUsers(raw) {
  const users = new Map()
  for (const entry of raw.split(",")) {
    const i = entry.indexOf(":")
    if (i > 0) users.set(entry.slice(0, i).trim().toLowerCase(), entry.slice(i + 1).trim())
  }
  return users
}
const serialise = (users) => [...users].map(([u, h]) => `${u}:${h}`).join(",")

function ask(question, hidden = false) {
  return new Promise((done) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (hidden) {
      const write = rl._writeToOutput.bind(rl)
      rl._writeToOutput = (s) => {
        if (s.startsWith(question)) write(question + "*".repeat(s.length - question.length))
        else if (/^\r?\n$/.test(s)) write(s)
        else write("*".repeat(s.length))
      }
    }
    rl.question(question, (answer) => {
      rl.close()
      done(answer)
    })
  })
}

const args = process.argv.slice(2)
const lines = readLines()
const users = parseUsers(getVar(lines, "DASHBOARD_USERS"))

if (args[0] === "--list") {
  console.log(users.size ? [...users.keys()].join("\n") : "No users configured.")
  process.exit(0)
}

if (args[0] === "--remove") {
  const name = (args[1] ?? "").toLowerCase()
  if (!users.delete(name)) {
    console.error(`No user named "${name}".`)
    process.exit(1)
  }
  setVar(lines, "DASHBOARD_USERS", serialise(users))
  save(lines)
  console.log(`Removed "${name}". Restart the dev server to apply.`)
  process.exit(0)
}

const username = (await ask("Username: ")).trim().toLowerCase()
if (!USERNAME_RE.test(username)) {
  console.error("Username must be 2–32 characters: letters, digits, dot, underscore or hyphen.")
  process.exit(1)
}
const password = await ask(`Password (at least ${MIN_PASSWORD} characters): `, true)
if (password.length < MIN_PASSWORD) {
  console.error(`Password must be at least ${MIN_PASSWORD} characters.`)
  process.exit(1)
}
if ((await ask("Confirm password: ", true)) !== password) {
  console.error("Passwords do not match.")
  process.exit(1)
}

const salt = randomBytes(16)
users.set(username, `scrypt.${salt.toString("hex")}.${scryptSync(password, salt, 64).toString("hex")}`)
if (getVar(lines, "AUTH_SECRET").length < 32) setVar(lines, "AUTH_SECRET", randomBytes(32).toString("hex"))
setVar(lines, "DASHBOARD_USERS", serialise(users))
save(lines)
console.log(`\nSaved "${username}" to .env.local (password stored as a salted hash). Restart the dev server to apply.`)
