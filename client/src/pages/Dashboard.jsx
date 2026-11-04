import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DashboardVoiceAssistant from "../components/DashboardVoiceAssistant";
import { API_BASE_URL } from "../config";

const DEFAULT_SERVICES = [
  {
    id: "income-certificate",
    name: { en: "Income Certificate", kn: "ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ", hi: "आय प्रमाण पत्र" },
    description: { en: "Apply for Income Certificate for government subsidies and admissions.", kn: "ಸರ್ಕಾರಿ ಸಬ್ಸಿಡಿ ಮತ್ತು ಪ್ರವೇಶಕ್ಕಾಗಿ ಆದಾಯ ಪ್ರಮಾಣಪತ್ರಕ್ಕೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.", hi: "सरकारी सब्सिडी और प्रवेश के लिए आय प्रमाण पत्र हेतु आवेदन करें।" },
    category: "Revenue",
    icon: "💰"
  },
  {
    id: "pension-certificate",
    name: { en: "Pension Certificate", kn: "ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ", hi: "पेंशन प्रमाण पत्र" },
    description: { en: "Apply for Old Age, Disability, or Widow pension certificate.", kn: "ವೃದ್ಧಾಪ್ಯ, ಅಂಗವಿಕಲತೆ ಅಥವಾ ವಿಧವಾ ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರಕ್ಕಾಗಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.", hi: "वृद्धावस्था, दिव्यांग या विधवा पेंशन प्रमाण पत्र के लिए आवेदन करें।" },
    category: "Social Welfare",
    icon: "📜"
  },
  {
    id: "disability-certificate",
    name: { en: "Disability Certificate", kn: "ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ", hi: "दिव्यांगता प्रमाण पत्र" },
    description: { en: "Apply for Disability Certificate (UDID card) and welfare benefits.", kn: "ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ (UDID ಕಾರ್ಡ್) ಮತ್ತು ಕಲ್ಯಾಣ ಸೌಲಭ್ಯಗಳಿಗಾಗಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.", hi: "दिव्यांगता प्रमाण पत्र (UDID कार्ड) और कल्याणकारी लाभों के लिए आवेदन करें।" },
    category: "Healthcare",
    icon: "♿"
  }
];

export default function Dashboard() {
  const { user, token, logout, lang } = useAuth();
  const navigate = useNavigate();

  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Multilingual translations localized for Dashboard UI
  const translations = {
    en: {
      greeting: "Good morning",
      subGreeting: "What would you like to do today?",
      servicesTitle: "Available Services",
      appsTitle: "My Applications",
      logout: "Log out",
      apply: "Apply Now",
      noApps: "No applications found.",
      appId: "Application ID",
      service: "Service",
      date: "Date Submitted",
      status: "Status",
      category: "Category",
      loading: "Loading your dashboard...",
      errorLoading: "Failed to load dashboard data.",
      notSubmitted: "Not Submitted",
      resume: "Resume",
    },
    hi: {
      greeting: "शुभ प्रभात",
      subGreeting: "आज आप क्या करना चाहेंगे?",
      servicesTitle: "उपलब्ध सेवाएं",
      appsTitle: "मेरे आवेदन",
      logout: "लॉग आउट",
      apply: "अभी आवेदन करें",
      noApps: "कोई आवेदन नहीं मिला।",
      appId: "आवेदन संख्या (ID)",
      service: "सेवा",
      date: "जमा करने की तिथि",
      status: "स्थिति",
      category: "श्रेणी",
      loading: "डैशबोर्ड लोड हो रहा है...",
      errorLoading: "डैशबोर्ड डेटा लोड करने में विफल।",
      notSubmitted: "जमा नहीं किया गया",
      resume: "जारी रखें",
    },
    kn: {
      greeting: "ಶುಭೋದಯ",
      subGreeting: "ಇಂದು ನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
      servicesTitle: "ಲಭ್ಯವಿರುವ ಸೇವೆಗಳು",
      appsTitle: "ನನ್ನ ಅರ್ಜಿಗಳು",
      logout: "ಲಾಗ್ ಔಟ್",
      apply: "ಈಗಲೇ ಅರ್ಜಿಹಾಕಿ",
      noApps: "ಯಾವುದೇ ಅರ್ಜಿಗಳು ಕಂಡುಬಂದಿಲ್ಲ.",
      appId: "ಅರ್ಜಿ ಸಂಖ್ಯೆ (ID)",
      service: "ಸೇವೆ",
      date: "ಸಲ್ಲಿಸಿದ ದಿನಾಂಕ",
      status: "ಸ್ಥಿತಿ",
      category: "ವರ್ಗ",
      loading: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
      errorLoading: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಲೋಡ್ ಮಾಡಲು ವಿಫಲವಾಗಿದೆ.",
      notSubmitted: "ಸಲ್ಲಿಸಲಾಗಿಲ್ಲ",
      resume: "ಮುಂದುವರಿಸಿ",
    }
  };

  const t = translations[lang] || translations.en;

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch services
        const servicesRes = await fetch(`${API_BASE_URL}/api/services`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const servicesData = await servicesRes.json();

        // Fetch applications
        const appsRes = await fetch(`${API_BASE_URL}/api/applications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const appsData = await appsRes.json();

        if (servicesRes.ok && appsRes.ok) {
          if (servicesData.services && servicesData.services.length > 0) {
            setServices(servicesData.services);
          }
          setApplications(appsData.applications || []);
        } else {
          setError(t.errorLoading);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError(t.errorLoading);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, navigate, lang, t.errorLoading]);

  return (
    <div style={{ background: "#092d2c", minHeight: "100vh", color: "#f6f3eb", padding: "40px 20px" }}>
      <div className="grain"></div>
      
      <div className="wrap" style={{ maxWidth: "1200px" }}>
        {/* Top Navbar */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "50px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "20px" }}>
          <Link className="brand" to="/" style={{ color: "#fff" }}>
            <span className="brand-mark">
              <img src="/vocalyze-logo.png" alt="Vocalyze Logo" />
            </span>
            Vocalyze
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <span style={{ fontSize: "14px", fontWeight: "700" }}>
              {t.greeting}, {user?.name || "User"}
            </span>
            {user?.preferredLanguage && (
              <span style={{ background: "rgba(219, 245, 96, 0.1)", color: "#d9f560", padding: "4px 10px", borderRadius: "10px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>
                {user.preferredLanguage}
              </span>
            )}
            <button
              onClick={logout}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "14px",
                padding: "8px 16px",
                color: "#fff",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              {t.logout}
            </button>
          </div>
        </header>

        {/* AI Voice Assistant for Blind / Accessible Navigation (Hands-free voice in & voice out) */}
        <DashboardVoiceAssistant
          user={user}
          services={services}
          applications={applications}
          logout={logout}
          lang={lang}
          token={token}
        />

        {error && (
          <p style={{ color: "#ffb798", background: "rgba(255, 183, 152, 0.07)", padding: "12px 18px", borderRadius: "12px", fontSize: "13px", marginBottom: "30px" }}>
            ⚠️ {error}
          </p>
        )}

        <h2 style={{ font: "800 24px 'Outfit', 'Plus Jakarta Sans', sans-serif", marginBottom: "8px", color: "#fff" }}>{t.subGreeting}</h2>

        {/* Dynamic Services Grid */}
        <section style={{ marginBottom: "60px", marginTop: "30px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#8ca19c", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "20px" }}>{t.servicesTitle}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
            {services.map((service) => (
              <article
                key={service.id}
                style={{
                  background: "rgba(18, 49, 47, 0.65)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(217, 245, 96, 0.15)",
                  borderRadius: "20px",
                  padding: "30px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "200px"
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "700", background: "rgba(255,255,255,0.06)", padding: "4px 8px", borderRadius: "6px", textTransform: "uppercase", color: "#8ca19c" }}>
                    {service.category || t.category}
                  </span>
                  <h4 style={{ font: "800 20px 'Outfit', 'Plus Jakarta Sans', sans-serif", margin: "12px 0 8px 0", color: "#fff" }}>
                    {service.name && typeof service.name === "object" ? (service.name[lang] || service.name.en) : service.name}
                  </h4>
                  <p style={{ fontSize: "13px", color: "#aab7b3", margin: 0, lineHeight: "1.5" }}>
                    {service.description && typeof service.description === "object" ? (service.description[lang] || service.description.en) : service.description}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/service/${service.id}`)}
                  style={{
                    background: "#d9f560",
                    border: "none",
                    borderRadius: "12px",
                    padding: "12px",
                    color: "#12312f",
                    fontWeight: "800",
                    fontSize: "14px",
                    marginTop: "20px",
                    width: "100%",
                    cursor: "pointer"
                  }}
                >
                  {t.apply} →
                </button>
              </article>
            ))}
          </div>
        </section>

        {/* Submitted Applications List */}
        <section>
          <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#6c7b77", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "20px" }}>{t.appsTitle}</h3>
          {applications.length === 0 ? (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "20px", padding: "40px", textAlign: "center", color: "#6c7b77" }}>
              {t.noApps}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", background: "rgba(18, 49, 47, 0.45)", borderRadius: "20px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)", textAlign: "left", fontSize: "12px", textTransform: "uppercase", color: "#6c7b77" }}>
                    <th style={{ padding: "18px 24px" }}>{t.appId}</th>
                    <th style={{ padding: "18px 24px" }}>{t.service}</th>
                    <th style={{ padding: "18px 24px" }}>{t.date}</th>
                    <th style={{ padding: "18px 24px" }}>{t.status}</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: "14px" }}>
                  {applications.map((app) => (
                    <tr key={app.applicationId} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "18px 24px", fontFamily: "DM Mono", fontWeight: "700" }}>{app.applicationId}</td>
                      <td style={{ padding: "18px 24px", color: "#fff", fontWeight: "700" }}>
                        {(() => {
                          const s = services.find(s => s.id === app.serviceId);
                          if (!s) return app.serviceId;
                          return typeof s.name === "object" ? (s.name[lang] || s.name.en) : s.name;
                        })()}
                      </td>
                      <td style={{ padding: "18px 24px", color: "#aab7b3" }}>{app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "-"}</td>
                      <td style={{ padding: "18px 24px" }}>
                        <span style={{
                          padding: "6px 12px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "800",
                          background: app.status === "SUBMITTED" ? "rgba(217, 245, 96, 0.15)" : "rgba(255,255,255,0.06)",
                          color: app.status === "SUBMITTED" ? "#d9f560" : "#aab7b3"
                        }}>
                          {app.status || t.notSubmitted}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
