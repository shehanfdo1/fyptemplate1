console.log("[DEBUG] Loading Custom OS Shim");

const osMock = {
    type: function () { return "Browser"; },
    release: function () { return "1.0.0"; },
    platform: function () { return "browser"; },
    arch: function () { return "x64"; },
    hostname: function () { return "localhost"; },
    eol: "\n",
    tmpdir: function () { return "/tmp"; },
    homedir: function () { return "/tmp"; },
    userInfo: function () { return { username: "user", uid: 1, gid: 1, homedir: "/tmp", shell: "/bin/bash" }; },
    endianness: function () { return "LE"; },
    loadavg: function () { return [0, 0, 0]; },
    uptime: function () { return 0; },
    freemem: function () { return 0; },
    totalmem: function () { return 0; },
    cpus: function () { return []; },
    networkInterfaces: function () { return {}; }
};

// Explicitly handle all export scenarios
module.exports = osMock;
module.exports.default = osMock;
module.exports.platform = osMock.platform;
module.exports.type = osMock.type;
module.exports.release = osMock.release;
