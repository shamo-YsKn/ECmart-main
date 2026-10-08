import { networkInterfaces } from "node:os"
import { createConnection } from "node:net"

const PORT = Number(process.env.PORT || 3000)

function lanIPv4Addresses() {
  const results = []
  for (const [name, entries] of Object.entries(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        results.push({ name, address: entry.address })
      }
    }
  }
  return results
}

function tcpCheck(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port })
    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(result)
    }
    socket.setTimeout(timeoutMs)
    socket.once("connect", () => finish({ ok: true }))
    socket.once("timeout", () => finish({ ok: false, error: "timeout" }))
    socket.once("error", (error) => finish({ ok: false, error: error.code || error.message }))
  })
}

console.log("\n=== Machinowa LAN doctor ===")
console.log(`Port: ${PORT}`)

const addresses = lanIPv4Addresses()
if (addresses.length === 0) {
  console.log("\n[NG] LAN IPv4 address was not found.")
  console.log("Wi-Fi/Ethernet connection and Windows network adapter status should be checked.")
  process.exitCode = 1
} else {
  console.log("\nDetected LAN IPv4 addresses:")
  for (const item of addresses) {
    console.log(`- ${item.name}: ${item.address}`)
  }
}

const loopback = await tcpCheck("127.0.0.1", PORT)
console.log(`\n127.0.0.1:${PORT}: ${loopback.ok ? "LISTENING" : `not reachable (${loopback.error})`}`)

for (const item of addresses) {
  const result = await tcpCheck(item.address, PORT)
  console.log(`${item.address}:${PORT}: ${result.ok ? "LISTENING" : `not reachable (${result.error})`}`)
  console.log(`  Browser URL: http://${item.address}:${PORT}`)
  console.log(`  Health URL : http://${item.address}:${PORT}/api/health`)
}

console.log("\nInterpretation:")
console.log("- localhost and LAN IP both LISTENING: Next.js is reachable on the LAN interface; check Windows Firewall/router client isolation if another device still cannot connect.")
console.log("- localhost LISTENING but LAN IP not reachable: the running process is likely bound only to loopback, or another process owns port 3000.")
console.log("- neither LISTENING: the Next.js server is not running on this port.")
console.log("\nRecommended development start command:")
console.log("  npm run dev:network")
console.log("\nOn Windows, this command is also useful:")
console.log("  netstat -ano | findstr :3000")
console.log("Expected listener: 0.0.0.0:3000 or [::]:3000, not only 127.0.0.1:3000.\n")
