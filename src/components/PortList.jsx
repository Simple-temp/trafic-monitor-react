import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Box,
  Typography,
  Paper,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import HistoryIcon from "@mui/icons-material/History";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Assets
import downSoundFile from "../assets/inactive.wav";
import upSoundFile from "../assets/active.wav";

const noNeedToShowWhichAliasesStartWithThis = [
  "ACCESS",
  "***To-Core-RT***",
  "***BD-COM-Secondary***",
  "LALIN",
  "***SW-To-SW",
  "***sfp-inserted***",
  "*201805-SPEED-NET-BAIZID-BAIZID",
  "**Star-Teleservices-Communic",
  "*200983-SPEED-NET-LALMAI",
  "***Skyview",
  "***HomeNet-Solution",
  "***SK-Communication",
  "SCL-Aggregation-Link",
  "****With-F@H-10G***",
  "***Summit-AGG***",
  "KK-Huawei-SW-1",
  "***Peer-with-KK-PTX-RT",
  "**Kolkata-Uplink",
  "***MS-WIFI-CUMILLA",
  "STT-Data-Dhaka",
  "***Muktijodda-Wifi-Cumilla",
  "HM_Enterprise_Router",
  "Connected With Cloudeone",
  "CONNECTED WITH ITEL",
  "***Free***",
  "Optimus-Online",
  "*Interlink-Communication",
  "Dark-Online",
  "LJ-Broadband-Bahon",
  "Local",
  "CISCO-SW",
  "***Bluenet-FNA***",
  "***Skytel-MCDN***",
  "***Core-IT-Khawja",
  "***htl-vt-cdn-ibgp***",
  "***NHK-PTX-1000-MGT***",
  "***Hard-Loop-port-71-to-port-65",
  "**HomeNet-Solution-FHL-IPT**",
  "***Earth-CDN***",
  "***ETL-IPT***",
  "***Skytel-Baishan",
  "**I-Communication",
  "**Core-IT-P2P**",
  "*SAM-Online",
  "**Core-IT",
  "***Bluenet-Bak",
  "*Niloy-Net-Communication",
  "***Earth-Baishan***",
  "***SAM-GGC***",
  "***Skytel-MCDN-Backup***",
  "**HomeNet-Solution",
  "*Alfa-Online-SCL",
  "Spark-Dot-Net-Sylhet",
  "***Sujon-IT-Faridpur-SCL",
  "*Cyber-Net-Communications",
  "*Smirity-Cable-Internet",
  "***Hasib-Vai-Home",
  "***Optimus-Online",
  "***Universal-Multimedia",
  "***LINK-TO",
  "IQ_Tel",
  "CONNECTED WITH",
  "MC_BROADBAND",
  "LCN_LINK",
  "LAXMIPURUR CWDM",
  "LAXMIPUR_RUBEL",
  "***NHK-CDN",
  "**Niloy-Net-Communication",
  "***HP-Link-Natore",
  "**Suchona-Mymensing",
  "**Brothers-ICT",
  "Bluenet-BCDN-HTL",
  "***Mission-Computer-Benapole",
  "Sixty-Four-Networks",
  "***DOT-INTERNET",
  "***NX-2-to_huawei***",
  "***Panthapath-POP",
  "***With-BDCOM-SW***",
  "FULL-RIVER",
  "***SAM-Online-Baishan***",
  "***Core-IT",
  "***Smirity-Cable",
  "Smirity-Cable",
  "***NHK-CCL",
  "**SK-Communication-Benapole",
  "SK-Communication-Benapole",
  "Free",
  "**ETL-IPT-Secondary**",
  "Amazing-Online-Bahon-IPT",
  "***KR-Online-Cumilla-MCDN***",
  "***F@HOME-HTL-IPT***",
  "*Athoy-Cyber-Net-F@H-IPT*",
  "***GFCL-GGC-Primary***",
  "Si-Net-SCL-CDN",
  "***MRipon-F@H-MCDN***",
  "Stardust-Express-CDN",
  "***Maxim-Server-MGT***",
  "*Anu-Ambia-SCL-MCDN*",
  "***Suchona-Mymensing",
  "***Brothers-ICT-MCDN-VLAN-2*",
  "***Jadoo-CDN***",
  "**HP-Link-Natore-Bahon-MCDN**",
  "Dot-Internet-CDN-Upstream",
  "***HTL-PTX-to-RND-MKT-INT***",
  "**Hasib-Vai-Home-CDN**",
  "**King-IT-Cisco-BDIX**",
  "***Local-SW***",
  "MONIR",
  "Moni",
  "***Uzzal-OLT***",
  "***GFCL-New-Port***",
  "***Mazada-WAN***",
  "Mazada-FOr-Test",
  "Mazada-FOr-Test",
  "***Client***",
  "***CCL-Backbone_VXLAN-SW***",
  "DHK-DC-HW-6865-01",
  "***From-RT***",
  "***BrothersIT***",
  "GFCL-Port-1",
  "GFCL-Port-2",
  "SAM-Link-1",
  "SAM-Link-2",
  "***Stargate-Baishan***",
  "**Bahon-Client-Aggrigation--HTLBW00AP3**",
  "Colocity-HW-SW-UG-Bahon",
  "Colocity-HW-SW-OH-Wire-IT",
  "***Digi_Jadoo***",
  "***MAXIM-Radious-SERVER***",
  "***MAC-Client-SAHABA-Online***",
  "***Sixty-Four-Network-Data***",
  "Sixty-Four-Network-Data",
  "Sixty-Four-Network-Data",
  "Sixty-Four-Network-Data",
  "Sixty-Four-Network-Data",
  "Suchona-Mymanshing",
  "MAXIM-Radius-SERVER",
  "Sixty-Four-Network-Data",
  "BGN-Data",
  "BGN-Data",
  "***DHK-CCL-INT-RT-To-DHK-CCL-PNI-RT***",
  "***Khaja-CCL-MX204-INT-RT-to-Khaja-CCL-PTX-PNI-RT***",
  "***Khaja-CCL-MX204-PNI-RT-to-Khaja-CCL-PTX-INT-RT***",
  "***DHK-CCL-PNI-RT-To-DHK-CCL-INT-RT***",
  "**SKYNET-IPT**",
  "***DHK-CCL-PNI-RT-to-DHK-HTL-MCDN-RT***",
  "***Khaja-CCL-MX204-PNI-RT-to-DHK-HTL-GGC-RT***",
  "***DHK-CCL-MX204-PNI-RT-to-JES-CCL-PTX-PNI-RT***",
  "***DHK-CCL-MX204-PNI-RT-to-DHK-HTL-BCDN-RT***",
  "Skytel-FB-PNI-ColoAsia",
  "DHK-CCL-MX204-INT-RT-to-KK-CCL-PTX-INT-RT-LTC/F@H/CCL/100G/KOL/3",
  "***FGL_Agg_SCR-111958***",
  "FGL-3rd-Link-SCR-134458",
  "***Coronet-FGL-AGG-SW***",
  "***DHK-CN-INT-RT-to-DHK-CN-PNI-RT***",
  "**Smirity-Cable-Internet-Uttara-PNI-PRI**",
  "***Cloud-Online-Vulta-Bahon-PNI***",
  "Universal-Multimedia-INT",
  "***Bahon-Test***",
  "***ICT-Mart-BD-FGL-PNI***",
  "**DOT-INTERNET-FB-PNI-KK**",
  "Skytel-FB-PNI-Venture-Tower",
  "***CCL-PTX-to-RND-MKT-PNI***",
  "***CCL-PTX-to-RND-MKT-Google-PNI***",
  "Universal-Multimedia-Centre-PNI",
  "Dream.Net-SCL-PNI",
  "*My-Net-IPT*",
  "***DHK-CCL-PTX-INT-RT-to-JES-CCL-CISCO-INT-RT***",
  "***DHK-CCL-PTX-PNI-RT-to-JES-CCL-CISCO-PNI-VRF-RT***",
  "***DHK-CCL-PTX-INT-RT-to-JES-CCL-CISCO-PNI-RT***",
  "***Earth-Akamai-PNI***",
  "*Gazipur-network-system-GNS*",
  "**BHARTI-ITC-IPT**",
  "DHK-CCL-PTX-INT-RT-to-DHK-CCL-MX204-PNI-RT",
  "***Voxility-IPT***",
  "***MAIJDEE_CORE_SW1-10GE1/0/29***",
  "With_Bwm_SW:Eth-Trunk30",
  "***NHK-Hello-Tech-PTX-ae3***",
  "***CN-NHK-INT-RT-to-CN-NHK-PNI-RT***",
  "***CN-NHK-PNI-RT-to-CN-NHK-INT-RT***",
  "**FGL-Jessore-Facebook-PNI**",
  "**FGL-Jessore-AGG-PNI**",
  "**Three-Dot-Net-IPT**",
  "NHK-CCL-IIG-MX204-RT",
  "**ABRAHAM_BROADBAND-ANIK-IPT**",
  "***Amazon-KK**Amazon-Circuit-ID-CIRCUIT-396427-Cross-Connect-  ID-091KOLK1258A0184785***",
  "NHK-CCL-IIG-MX204-RT",
  "***FB-1-KK***STT-Circuit-ID-C1I190-1000028761-01/02-R1-TCL-Circuit-ID-091KOLK1258A0300337**",
  "NHK-CCL-IIG-MX204-RT",
  "NHK-CCL-MX204-INT-RT-KK-CCL-PTX-INT-RT-to-via-LS_and_Bahon",
  "NHK-CCL-IIG-MX204-RT",
  "NHK-CCL-MX204-PNI-RT-KK-CCL-PTX-PNI-RT-to-via-LS_and_Bahon",
  "NHK-CCL-IIG-MX204-RT",
  "NHK-CCL-MX204-GOOGLE-RT-KK-CCL-PTX-GOOGLE-RT-to-via-LS_and_Bahon",
  "NHK-CCL-IIG-MX204-RT",
  "**SUCHONA-BROADBAND-IIG**",
  "NHK-CCL-IIG-PTX-RT",
  "***Amazon-KK**Amazon-Circuit-ID-CIRCUIT-396427-Cross-Connect-ID-091KOLK1258A0308326***",
  "NHK-CCL-IIG-PTX-RT",
  "***KK-FB-2-FB-02-TCL-CID:T218908640-FB-CID:FC-205608830***",
  "NHK-CCL-IIG-PTX-RT",
  "***AMS-IX-KK-STT-Circuit-ID:C1I190-1000028948-01/02-R1-TCL-Circuit-ID:091KOLK1258A0308326***",
  "NHK-CCL-IIG-PTX-RT",
  "**ABRAHAM_BROADBAND-ANIK-IPT-RDN**",
  "NHK-CCL-IIG-PTX-RT",
  "**Three-Dot-Net-IPT-RDN**",
  "NHK-CCL-IIG-PTX-RT",
  "**SUCHONA-BROADBAND-IIG**",
  "NHK-CCL-IIG-PTX-RT",
  "**ITEL-GGC-CGP-5**",
  "NHK-CCL-IIG-PTX-RT",
  "**SNC-MAC-CORE-9-GGC**",
  "DASHERHAT_HW_SW",
  "DASHERHAT_CWDM-1",
  "DASHERHAT_HW_SW",
  "JALA_WAN-LINK-1",
  "DASHERHAT_HW_SW",
  "JALA_WAN-LINK-2",
  "DASHERHAT_HW_SW",
  "***JS-Online-CDN-RW-SFP+2***",
  "MANDARI-HW",
  "SK_CWDM_LINK-1",
  "MANDARI-HW",
  "SK_CWDM_LINK-4",
  "MANDARI-HW",
  "STAR_NET(ANDARGHOR)",
  "MANDARI-HW",
  "ZAKIA_ONLINE",
  "MANDARI-HW",
  "DASHERHAT_CWDM",
  "MANDARI-HW",
  "test",
  "test",
  "JH_HW-40G",
  "JOHN HOME OLT",
  "JH_HW-40G",
  "JOHIR-BHAI_WAN-1",
  "SkyPath_Santo-Link",
  "JH_HW-40G",
  "GLOBE AGRO",
  "BANGLABAZAR-POP-HW",
  "TEST",
  "BANGLABAZAR-POP-HW",
  "BCN SHOPON",
  "BANGLABAZAR-POP-HW",
  "JIRTULI_LINK",
  "BANGLABAZAR-POP-HW",
  "AMINBAZAR 10G LINK",
  "BANGLABAZAR-POP-HW",
  "JH_KAMAL_ROUTER_WAN",
  "FENI_HUAWEI",
  "BAHON_LINK-2-4Cr",
  "KALIBAZAR_HW_SW",
  "RB_ONLINE_LINK",
  "KALIBAZAR_HW_SW",
  "LAXMIPUR_LINK",
  "KALIBAZAR_HW_SW",
  "MOUMITA_LINK",
  "KALIBAZAR_HW_SW",
  "DURONTO_BANGLA_NET",
  "KALIBAZAR_HW_SW",
  "RUBI_ONLINE",
  "KALIBAZAR_HW_SW",
  "LAXMIPUR-CWDM",
  "KALIBAZAR_HW_SW",
  "BASUBAZAR_LINK",
  "AMINBAZAR_HW",
  "TEST",
  "AMINBAZAR_HW",
  "ROUTER_WAN",
  "CHANDRAGONJ-HW",
  "test",
  "CHANDRAGONJ-HW",
  "SK_WAN-IIG",
  "CHANDRAGONJ-HW",
  "SK_FNA-GGC",
  "LAXMIPUR_HUAWEI-02",
  "SUMMIT_LINK",
  "LAXMIPUR_HUAWEI-02",
  "HUAWEI_SW_to_SW-Link",
  "LAXMIPUR_HUAWEI-02",
  "RAYPUR_TANVIR-100G_LINK",
  "SKYNET_LAX_CORE_SW01",
  "SKYNET_LAX_CORE_SW01",
  "***ACCESS-1:SFP+4***",
  "SKYNET_LAX_CORE_SW01",
  "BAZRA_MOHON-WIFI",
  "SONAIMURI-POP_HW-100G",
  "BanglaBazar_3DotNet_HW",
  "***Maijdee-  Core-SW-8850-100GE1/0/5***",
  "SKYNET_LAX_CORE_SW02",
  "SKYNET_LAX_CORE_SW02",
  "***HTL-NHK-PTX:et-0/0/19***",
  "SKYNET_LAX_CORE_SW02",
  "***SNC-MAC-CORE-2:40G-4***",
  "CHATKHIL-POP_HW-100G",
  "3dotNet_BanglaBazar",
  "FARIDGONJ-POP_HW-100G",
  "FARIDGONJ-SIR-LINK",
  "HUAWEI_OLT_LINK-01",
  "FENI_LAN_HUAWEI",
  "SAMIA_NETWORK_BACKUP_LINK",
  "RONY_CABLE(MS_NET)",
  "BAHON_AGG_LINK-02",
  "FENI-OFFICE_IP-CAMERA_POE-SW",
  "NEXUS_TO_LAN_HUAWEI_LINK",
  "***Laxmipur-Core-SW-8850-100GE1/0/5***",
  "***LINK_WITH_DELLR740XD_FOR_CHR-PORT-1***",
  "MAIJDEE_CORE_SW2",
  "MAIJDEE_CORE_SW2",
  "***CHAGOLNAIYA-OLT-VLAN***",
  "**MYNET-BDCOM-OLT-4**",
  "*Smart-Link*",
  "*CTG-Tel*",
  "*Smart-Link-RDN*",
  "CONNECTED-WITH_LAN-NXS",
  "CONNECTED_WITH-CTG_LAN_HUAWEI_100GE0/0/6",
  "******KEPZ SAYEM BHAI******",
  "***TEST-QINQ-VXLAN***",
  "**201779-POSHURAM-SPEED-NET-BDIX**",
  "**201776-POSHURAM-SPEED-NET-GGC**",
  "**201775-POSHURAM-SPEED-NET-INT**",
  "**201777-POSHURAM-SPEED-NET-FNA**",
  "**201778-POSHURAM-SPEED-NET-BDIX**",
  "*200980-SPEED-NET-LALMAI_IPT*",
  "*200981-SPEED-NET-LALMAI_GGC*",
  "*200982-SPEED-NET-LALMAI_FNA*",
  "*200984-SPEED-NET-LALMAI_NIX*",
  "*201805-SPEED-NET-BAIZID_IPT*",
  "*201806-SPEED-NET-BAIZID_GGC*",
  "*201807-SPEED-NET-BAIZID_FNA*",
  "*201808-SPEED-NET-BAIZID_CDN*",
  "*201809-SPEED-NET-BAIZID_NIX*",
  "**202900-SPEED-NET-BAYEZID-IPT-SEC**",
  "**202901-SPEED-NET-BAYEZID-GGC-SEC**",
  "**202902-SPEED-NET-BAYEZID-FNA-SEC**",
  "**202903-SPEED-NET-BAYEZID-CDN-SEC**",
  "**202904-SPEED-NET-BAYEZID-NIX-SEC**",
  "***RABBIT-DATA***",
  "***PLUSNET-DATA***",
  "***CTG-TEL-BCDN***",
  "**SITAKUNDA-OLTAI-HOTSPOT**",
  "AVIBA_RESOURCE_KANDIRPAR_SIDE-02",
  "AVIBA_RESOURCE_CHAWKBAZAR_SIDE-02",
  "Muktijoddha-wifi-cumilla-MAC",
  "***Maijdee-Core-SW-8850",
  "Core-5_Lan",
  "JSS_ONLINE-3rd_Link",
  "***From_STT***",
  "CTG_SERVER_SFP+1",
  "***Josh-Internet-Kushtia-Baho",
  "GMAX-GGC",
  "***Amazon-KK**Amazon-Circuit",
  "free",
  "GMAX-GGC",
  "LOCAL",
  "***smirity-cable-pni***",
  "**GMAX-GGC-Primary**",
];

function isSnmpError(iface) {
  return (
    iface.ifType === 0 &&
    iface.ifSpeed === 0 &&
    iface.ifAdminStatus === 0 &&
    iface.ifOperStatus === 0 &&
    iface.ifInErrors === 0 &&
    iface.ifOutErrors === 0 &&
    iface.ifInDiscards === 0 &&
    iface.ifOutDiscards === 0
  );
}

export default function PortList() {
  const [interfaces, setInterfaces] = useState([]);
  const [logs, setLogs] = useState([]);
  const [globalSearch, setGlobalSearch] = useState("");
  const [tabValue, setTabValue] = useState(0);

  const lastStatus = useRef({});
  const initialLoadDone = useRef(false);
  const downAudio = useRef(null);
  const upAudio = useRef(null);

  const playAudio = (audioRef) => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  useEffect(() => {
    const fetchData = () => {
      axios
        .get("http://localhost:5000/api/devices")
        .then((res) => {
          const allowedPrefixes = [
            "ae",
            "et",
            "lt",
            "xe",
            "10GE",
            "20GE",
            "30GE",
            "40GE",
            "25GE",
            "100GE",
            "Ethernet",
            "GigaEthernet",
            "TGigaEthernet",
          ];

          const filteredData = res.data.interfaces.filter((iface) => {
            const descr = iface.ifDescr || "";
            const alias = iface.ifAlias || "";
            const matchesPrefix = allowedPrefixes.some((p) =>
              descr.startsWith(p),
            );
            const hasAlias = alias.trim().length > 0;
            const isExcluded = noNeedToShowWhichAliasesStartWithThis.some((p) =>
              alias.startsWith(p),
            );

            return matchesPrefix && hasAlias && !isExcluded;
          });

          const newLogs = [];

          filteredData.forEach((iface) => {
            const key = `${iface.device_id}_${iface.ifIndex}`;
            let currentStatus = iface.ifOperStatus === 1 ? "UP" : "DOWN";
            if (isSnmpError(iface)) currentStatus = "SNMP ERROR";

            const previousStatus = lastStatus.current[key];

            if (
              initialLoadDone.current &&
              previousStatus !== undefined &&
              previousStatus !== currentStatus
            ) {
              const displayAlias = iface.ifAlias || iface.ifDescr || key;

              newLogs.push({
                id: Date.now() + Math.random(),
                device: iface.device_name,
                alias: displayAlias,
                from: previousStatus,
                to: currentStatus,
                time: new Date(),
              });

              if (currentStatus === "DOWN" || currentStatus === "SNMP ERROR") {
                if (currentStatus === "DOWN") {
                  playAudio(downAudio);
                  toast.error(`PORT DOWN: ${displayAlias}`);
                }
              } else if (currentStatus === "UP") {
                playAudio(upAudio);
                toast.success(`PORT UP: ${displayAlias}`);
              }
            }
            lastStatus.current[key] = currentStatus;
          });

          if (newLogs.length > 0) setLogs((prev) => [...newLogs, ...prev]);
          if (!initialLoadDone.current) initialLoadDone.current = true;
          setInterfaces(filteredData);
        })
        .catch((err) => console.error("Polling error:", err));
    };

    const interval = setInterval(fetchData, 1000);
    fetchData(); // Run once immediately
    return () => clearInterval(interval);
  }, []);

  const searchFilter = (i) => {
    const s = globalSearch.toLowerCase();
    return (
      i.device_name?.toLowerCase().includes(s) ||
      i.ifDescr?.toLowerCase().includes(s) ||
      i.ifAlias?.toLowerCase().includes(s)
    );
  };

  // --- SPLIT TAB FILTERING ---
  const downPorts = interfaces.filter(
    (i) => i.ifOperStatus !== 1 && !isSnmpError(i) && searchFilter(i),
  );
  const snmpPorts = interfaces.filter((i) => isSnmpError(i) && searchFilter(i));
  const upPorts = interfaces.filter(
    (i) => i.ifOperStatus === 1 && !isSnmpError(i) && searchFilter(i),
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "20px",
        backgroundColor: "#f8fafc",
      }}
    >
      <ToastContainer position="top-right" autoClose={3000} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <Typography variant="h5" fontWeight="900" color="#1e293b">
          PORT MONITOR
        </Typography>
        <TextField
          placeholder="Search..."
          size="small"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          sx={{ width: "400px", bgcolor: "#fff" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </div>

      <Tabs
        value={tabValue}
        onChange={(e, v) => setTabValue(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab
          icon={<ReportProblemIcon sx={{ color: "#ef4444" }} />}
          iconPosition="start"
          label={`DOWN (${downPorts.length})`}
        />
        <Tab
          icon={<WarningAmberIcon sx={{ color: "#f59e0b" }} />}
          iconPosition="start"
          label={`SNMP ERR (${snmpPorts.length})`}
        />
        <Tab
          icon={<CheckCircleIcon sx={{ color: "#22c55e" }} />}
          iconPosition="start"
          label={`UP PORTS (${upPorts.length})`}
        />
        <Tab icon={<HistoryIcon />} iconPosition="start" label="LOGS" />
      </Tabs>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {tabValue === 0 &&
          downPorts.map((i) => (
            <PortBlock key={`${i.device_id}_${i.ifIndex}`} item={i} />
          ))}
        {tabValue === 1 &&
          snmpPorts.map((i) => (
            <PortBlock key={`${i.device_id}_${i.ifIndex}`} item={i} />
          ))}
        {tabValue === 2 &&
          upPorts.map((i) => (
            <PortBlock key={`${i.device_id}_${i.ifIndex}`} item={i} />
          ))}
      </Box>

      {tabValue === 3 && (
        <Box sx={{ maxWidth: "900px" }}>
          {logs.slice(0, 50).map((log) => (
            <Paper
              key={log.id}
              sx={{
                p: 1.5,
                mb: 1,
                borderLeft: `5px solid ${log.to === "UP" ? "#22c55e" : log.to === "SNMP ERROR" ? "#f59e0b" : "#ef4444"}`,
              }}
            >
              <Typography variant="body2" fontWeight="bold">
                {log.device} � {log.alias}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Status: <b>{log.from}</b> ? <b>{log.to}</b> at{" "}
                {log.time.toLocaleTimeString()}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}

      <audio ref={downAudio} src={downSoundFile} />
      <audio ref={upAudio} src={upSoundFile} />
    </div>
  );
}

function PortBlock({ item }) {
  const error = isSnmpError(item);
  const statusLabel = error
    ? "SNMP ERROR"
    : item.ifOperStatus === 1
      ? "UP"
      : "DOWN";
  const themeColor = error
    ? "#f59e0b"
    : item.ifOperStatus === 1
      ? "#22c55e"
      : "#ef4444";

  return (
    <Box
      sx={{
        width: "300px",
        p: 2,
        bgcolor: "#fff",
        borderRadius: 2,
        borderLeft: `8px solid ${themeColor}`,
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
      }}
    >
      <Typography variant="caption" fontWeight="bold" color="textSecondary">
        {item.device_name}
      </Typography>
      <Typography
        variant="body1"
        fontWeight="900"
        noWrap
        sx={{ color: "#0f172a" }}
      >
        {item.ifAlias}
      </Typography>
      <Box
        sx={{
          mt: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="caption"
          fontWeight="900"
          sx={{ fontFamily: "monospace", color: "#A52A2A" }}
        >
          {item.ifDescr}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {error && (
            <WarningAmberIcon sx={{ fontSize: 14, color: themeColor }} />
          )}
          <Typography
            variant="caption"
            fontWeight="bold"
            sx={{ color: themeColor }}
          >
            {statusLabel}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
