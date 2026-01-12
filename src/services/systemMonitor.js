import si from 'systeminformation';
import os from 'os';

class SystemMonitor {
  /**
   * Get system overview
   */
  async getSystemInfo() {
    const [cpu, mem, osInfo] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.osInfo()
    ]);

    return {
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
        speed: cpu.speed
      },
      memory: {
        total: mem.total,
        free: mem.free,
        used: mem.used,
        available: mem.available,
        usedPercent: ((mem.used / mem.total) * 100).toFixed(2)
      },
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch,
        hostname: os.hostname()
      }
    };
  }

  /**
   * Get current resource usage
   */
  async getCurrentUsage() {
    const [cpuLoad, mem] = await Promise.all([
      si.currentLoad(),
      si.mem()
    ]);

    return {
      cpu: {
        currentLoad: cpuLoad.currentLoad.toFixed(2),
        currentLoadUser: cpuLoad.currentLoadUser.toFixed(2),
        currentLoadSystem: cpuLoad.currentLoadSystem.toFixed(2)
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        usedPercent: ((mem.used / mem.total) * 100).toFixed(2)
      },
      uptime: os.uptime()
    };
  }

  /**
   * Get network interfaces
   */
  async getNetworkInfo() {
    const interfaces = await si.networkInterfaces();
    return interfaces.filter(iface => !iface.internal).map(iface => ({
      name: iface.iface,
      ip4: iface.ip4,
      ip6: iface.ip6,
      mac: iface.mac,
      type: iface.type
    }));
  }

  /**
   * Get disk information
   */
  async getDiskInfo() {
    const disks = await si.fsSize();
    return disks.map(disk => ({
      fs: disk.fs,
      mount: disk.mount,
      size: disk.size,
      used: disk.used,
      available: disk.available,
      usedPercent: disk.use.toFixed(2)
    }));
  }

  /**
   * Check if system meets Hytale server requirements
   */
  async checkRequirements() {
    const mem = await si.mem();
    const minRamBytes = 4 * 1024 * 1024 * 1024; // 4GB minimum

    const requirements = {
      ram: {
        required: '4GB',
        available: (mem.total / (1024 * 1024 * 1024)).toFixed(2) + 'GB',
        meets: mem.total >= minRamBytes
      }
    };

    // Check Java installation
    try {
      const { execSync } = await import('child_process');
      const javaVersion = execSync('java --version 2>&1').toString();
      const versionMatch = javaVersion.match(/openjdk (\d+)/);
      
      requirements.java = {
        required: 'Java 25',
        installed: versionMatch ? `Java ${versionMatch[1]}` : 'Unknown',
        meets: versionMatch && parseInt(versionMatch[1]) >= 25
      };
    } catch {
      requirements.java = {
        required: 'Java 25',
        installed: 'Not found',
        meets: false
      };
    }

    requirements.allMet = requirements.ram.meets && requirements.java.meets;

    return requirements;
  }

  /**
   * Get process information for Java processes
   */
  async getJavaProcesses() {
    const processes = await si.processes();
    return processes.list
      .filter(p => p.name.toLowerCase().includes('java'))
      .map(p => ({
        pid: p.pid,
        name: p.name,
        cpu: p.cpu.toFixed(2),
        mem: p.mem.toFixed(2),
        started: p.started
      }));
  }
}

export default new SystemMonitor();
