import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function TermsAndConditions() {
  const [accepted, setAccepted] = useState(false);
  const navigation = useNavigation<any>();
  const terms = useMemo(
    () => [
      {
        title: "1. பயன்பாட்டின் பயன்பாடு",
        body: [
          "இந்த பயன்பாடு பயனர்களுக்கு வழங்கப்படும் சேவைகளை பயன்படுத்துவதற்காக உருவாக்கப்பட்டுள்ளது. பயனர்கள் இந்த பயன்பாட்டை சட்டப்படி மற்றும் நெறிமுறைகளுக்கு இணங்க பயன்படுத்த வேண்டும்.",
        ],
      },
      {
        title: "2. பயனர் பொறுப்புகள்",
        body: [
          "நீங்கள் வழங்கும் தகவல்கள் சரியானதாகவும் முழுமையானதாகவும் இருக்க வேண்டும்.",
          "உங்கள் கணக்கு விவரங்களை பாதுகாப்பாக வைத்திருப்பது உங்கள் பொறுப்பு.",
          "எந்தவொரு சட்டவிரோத செயல்களுக்கும் இந்த பயன்பாட்டை பயன்படுத்தக் கூடாது.",
        ],
      },
      {
        title: "3. தனியுரிமை (Privacy)",
        body: [
          "பயனர்களின் தனிப்பட்ட தகவல்கள் பாதுகாப்பாக சேமிக்கப்படும். இந்த தகவல்கள் சேவைகளை வழங்குவதற்காக மட்டுமே பயன்படுத்தப்படும்.",
        ],
      },
      {
        title: "4. சேவையின் மாற்றங்கள்",
        body: [
          "இந்த பயன்பாட்டின் சேவைகள் எப்போது வேண்டுமானாலும் மாற்றப்படலாம் அல்லது நிறுத்தப்படலாம். இதற்காக முன்னறிவிப்பு வழங்கப்படலாம் அல்லது வழங்கப்படாமல் இருக்கலாம்.",
        ],
      },
      {
        title: "5. பொறுப்புத் துறப்பு (Limitation of Liability)",
        body: [
          "இந்த பயன்பாட்டை பயன்படுத்துவதன் மூலம் ஏற்படும் எந்தவொரு இழப்புகளுக்கும் நிறுவனம் பொறுப்பல்ல.",
        ],
      },
      {
        title: "6. விதிமுறைகளில் மாற்றங்கள்",
        body: [
          "இந்த விதிமுறைகள் எப்போது வேண்டுமானாலும் மாற்றப்படலாம். மாற்றப்பட்ட விதிமுறைகள் இந்த பயன்பாட்டில் வெளியிடப்படும்.",
        ],
      },
      {
        title: "7. தொடர்புக்கு (Contact Information)",
        body: [
          "இந்த விதிமுறைகள் குறித்து ஏதேனும் கேள்விகள் இருந்தால், தயவுசெய்து எங்களை தொடர்பு கொள்ளவும்.",
        ],
      },
    ],
    [],
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>விதிமுறைகள் மற்றும் நிபந்தனைகள்</Text>

        <Text style={styles.lead}>
          இந்த பயன்பாட்டை (Application) பயன்படுத்துவதன் மூலம், கீழே
          குறிப்பிடப்பட்டுள்ள விதிமுறைகள் மற்றும் நிபந்தனைகளை நீங்கள்
          ஒப்புக்கொள்கிறீர்கள். தயவுசெய்து இந்த விதிமுறைகளை கவனமாக வாசிக்கவும்.
        </Text>

        {terms.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.body.map((p) => (
              <Text key={p} style={styles.paragraph}>
                {p}
              </Text>
            ))}
          </View>
        ))}

        <View style={styles.footerSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => setAccepted((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          style={styles.checkboxRow}
          hitSlop={10}
        >
          <View
            style={[styles.checkboxBox, accepted && styles.checkboxBoxChecked]}
          >
            {accepted ? <Text style={styles.checkboxTick}>✓</Text> : null}
          </View>
          <Text style={styles.checkboxText}>
            நான் விதிமுறைகள் மற்றும் நிபந்தனைகளை ஒப்புக்கொள்கிறேன்
          </Text>
        </Pressable>

        <Pressable
          disabled={!accepted}
          onPress={() => {
            // Hook up navigation here if needed
            navigation.navigate("Login");
          }}
          accessibilityRole="button"
          accessibilityState={{ disabled: !accepted }}
          style={({ pressed }) => [
            styles.button,
            !accepted && styles.buttonDisabled,
            pressed && accepted && styles.buttonPressed,
          ]}
        >
          <Text
            style={[styles.buttonText, !accepted && styles.buttonTextDisabled]}
          >
            தொடரவும்
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  lead: {
    fontSize: 14.5,
    lineHeight: 22,
    color: "#374151",
    marginBottom: 14,
  },
  section: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14.5,
    lineHeight: 22,
    color: "#374151",
    marginBottom: 6,
  },
  footerSpacer: {
    height: 110,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxBoxChecked: {
    borderColor: "#16A34A",
    backgroundColor: "#16A34A",
  },
  checkboxTick: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 18,
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#111827",
  },
  button: {
    backgroundColor: "#008541",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 14,
    // marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  buttonTextDisabled: {
    color: "#9CA3AF",
  },
});
