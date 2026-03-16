import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useNavigation } from "@react-navigation/native";
import * as ExpoPrint from "expo-print";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ViewShot from "react-native-view-shot";

import { scaleFont } from "@/constants/ScaleFont";
import { Directory, File, Paths } from "expo-file-system";
import Pdf from "react-native-pdf";
import Share from "react-native-share";
import { styles } from "./style";

export default function Print({ route }: any) {
  // params
  const { pdfPath } = route.params ?? {};
  const { name } = route.params ?? {};
  const { number } = route.params ?? {};

  const pdfFilePath = pdfPath;
  const PdfName = name;
  const Number = number;

  const navigation = useNavigation<any>();
  const viewShotRef = useRef<any>(null);

  // local state
  const [modalVisible, setModalVisible] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        navigation.goBack();
        return true;
      }
    );
    return () => backHandler.remove();
  }, []);

  // Utility: ensure file:// scheme on Android if needed
  const normalizeUri = (uri: string) => {
    if (!uri) return uri;
    if (Platform.OS === "android" && uri.startsWith("/"))
      return `file://${uri}`;
    return uri;
  };

  // Utility: small delay to let animations/overlay settle (10-300ms)
  const smallDelay = (ms = 250) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // check if WhatsApp is installed (best-effort)
  const isWhatsAppAvailable = async () => {
    try {
      // try scheme
      const can = await Linking.canOpenURL("whatsapp://send?text=test");
      return can;
    } catch {
      return false;
    }
  };

  // -------------------------
  // Capture & share as image
  // -------------------------
  const capturePageAsImage = async () => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      setModalVisible(false);
      await smallDelay(200);

      const timestamp = Date.now();
      const filename = `${PdfName || "document"}-${timestamp}.jpg`;
      const tempDir = new Directory(Paths.cache);
      const tempFile = new File(tempDir, filename);

      // --- Option 1: capture to a tmp file and copy (preferred) ---
      try {
        const tmpPath: string = await viewShotRef.current.capture({
          format: "jpg",
          quality: 1,
          result: "tmpfile", // <- returns a temporary file path
        });

        if (!tmpPath) throw new Error("Empty tmpfile capture");

        // ensure scheme is correct
        const srcPath = normalizeUri(tmpPath); // ensure file:// if needed
        const sourceFile = new File(srcPath);

        // copy tmp file -> cache temp file (uses supported API)
        await sourceFile.copy(tempFile);

        // share
        const shareOptions: any = {
          url: tempFile.uri,
          type: "image/jpeg",
          filename,
          title: "Share Image",
        };
        if (Number) {
          shareOptions.social = Share.Social.WHATSAPP;
          shareOptions.whatsAppNumber = String(Number);
        }

        await Share.open(shareOptions);

        // cleanup
        await tempFile.delete();
        // also optionally delete the tmpPath if required by view-shot (usually managed)
        return;
      } catch (tmpErr) {
        console.warn(
          "tmpfile capture/copy failed, falling back to base64:",
          tmpErr
        );
        // fall through to base64 approach
      }
    } catch (e: any) {
      console.log("IMAGE SHARE ERROR:", e);
      Alert.alert("Share Error", e?.message || "Failed to share image");
    } finally {
      setIsSharing(false);
    }
  };

  const saveImageWithWatermark = async (uri: string) => {
    try {
      // Defensive: ensure uri present
      if (!uri) throw new Error("No captured image uri");

      const timestamp = Date.now();
      const filename = `${PdfName || "document"} - ${timestamp}.jpg`;
      const targetDirectory = new Directory(Paths.document);
      const filePath = `${targetDirectory.uri}/${filename}`;
      const targetFile = new File(filePath);

      const dirInfo = await targetDirectory.info();
      if (!dirInfo.exists) {
        await targetDirectory.create({ intermediates: true });
      }

      // If already exists, just share it
      const fileInfo = await targetFile.info();
      if (fileInfo.exists) {
        await shareImage(normalizeUri(targetFile.uri), Number);
        return;
      }

      // copy source -> target and await completion
      const sourceFile = new File(normalizeUri(uri));
      await sourceFile.copy(targetFile);

      const newInfo = await targetFile.info();
      if (!newInfo.exists) throw new Error("Saved image not found after copy");

      await shareImage(normalizeUri(targetFile.uri), Number);
    } catch (error) {
      console.log("saveImageWithWatermark error:", error);
      Alert.alert("Error", "Failed to save image.");
    }
  };

  // -------------------------
  // PDF save & share
  // -------------------------
  const savePDF = async () => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      setModalVisible(false);
      await smallDelay(250);

      const targetDirectory = new Directory(Paths.document);
      const timestamp = Date.now();
      const filename = `${PdfName || "document"} - ${timestamp}.pdf`;
      const destPath = `${targetDirectory.uri}/${filename}`;
      const targetFile = new File(destPath);

      const dirInfo = await targetDirectory.info();
      if (!dirInfo.exists)
        await targetDirectory.create({ intermediates: true });

      const fileInfo = await targetFile.info();
      if (fileInfo.exists) {
        // await sharePDF(normalizeUri(targetFile.uri), Number);
        return;
      }

      const sourceFile = new File(normalizeUri(pdfFilePath));
      await sourceFile.copy(targetFile);

      const finalInfo = await targetFile.info();
      if (!finalInfo.exists) throw new Error("Failed to copy PDF");

      // await sharePDF(normalizeUri(targetFile.uri), Number);
    } catch (error) {
      console.log("savePDF error:", error);
      Alert.alert("Error", "Failed to save PDF.");
    } finally {
      setIsSharing(false);
    }
  };

  // -------------------------
  // Share helpers
  // -------------------------
  const shareImage = async (imageUri: string, number?: string) => {
    try {
      if (!imageUri) throw new Error("Invalid image uri");

      const shareOptions: any = {
        url: imageUri,
        type: "image/jpeg",
        title: "Share Image",
      };

      if (number) {
        // If WhatsApp share requested, verify availability and format
        const whatsappAvailable = await isWhatsAppAvailable();
        if (!whatsappAvailable) {
          Alert.alert(
            "WhatsApp not installed",
            "Cannot share via WhatsApp because the app is not installed."
          );
          return;
        }
        // react-native-share expects whatsAppNumber without plus sign, country code included. The caller must pass correct format.
        shareOptions.social = Share.Social.WHATSAPP;
        shareOptions.whatsAppNumber = String(number);
      }

      // await to avoid overlapping share intents
      await Share.open(shareOptions);
    } catch (err: any) {
      console.log("shareImage error", err);
      if (err && err.message && err.message.includes("User did not share")) {
        // user cancelled share — not an error
        return;
      }
      Alert.alert("Error", "Unable to share image.");
    }
  };

  const sharePDF = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      // close modal and give UI a moment to settle
      setModalVisible(false);
      await smallDelay(200);

      const timestamp = Date.now();
      const filename = `${PdfName || "document"}-${timestamp}.pdf`;

      // temp file in cache
      const tempDir = new Directory(Paths.cache);
      const tempFile = new File(tempDir, filename);

      // source file (ensure it's a file URI or a path the File constructor accepts)
      // normalizeUri handles adding file:// when required
      const sourceFile = new File(normalizeUri(pdfFilePath));

      // copy source -> temp (atomic-ish and efficient)
      await sourceFile.copy(tempFile);

      // OPTIONAL: check target exists / size
      const info = await tempFile.info();
      if (!info.exists) throw new Error("Temporary PDF not created");

      // prepare share options
      const shareOptions: any = {
        url: tempFile.uri,
        type: "application/pdf",
        title: "Share PDF",
        filename,
      };

      if (Number) {
        shareOptions.social = Share.Social.WHATSAPP;
        shareOptions.whatsAppNumber = String(Number);
      }

      // open share sheet (await so we don't race)
      await Share.open(shareOptions);

      // cleanup temp file (use API your SDK supports)
      await tempFile.delete();
    } catch (err: any) {
      console.log("sharePDF error", err);
      if (err && err.message && err.message.includes("User did not share")) {
        return;
      }
      Alert.alert("Error", "Unable to share PDF.");
    } finally {
      setIsSharing(false);
    }
  };

  // -------------------------
  // Print (unchanged, but awaited)
  // -------------------------
  const handlePrint = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      await ExpoPrint.printAsync({ uri: pdfFilePath });
    } catch (error) {
      console.log("Error printing:", error);
      Alert.alert("Error", "Failed to print document");
    } finally {
      setIsSharing(false);
    }
  };

  // close
  const close = () => {
    navigation.goBack();
  };

  // layout capture for A4 scaling
  const onViewShotLayout = (e: any) => {
    const { width, height } = e.nativeEvent.layout;
    if (width && height) setViewSize({ width, height });
  };

  return (
    <View style={styles.container}>
      <View
        style={{
          flexDirection: "row",
          gap: 50,
          marginBottom: 30,
          backgroundColor: "#008541",
          width: "100%",
          height: "7%",
        }}
      >
        <AntDesign
          name="close"
          size={scaleFont(25)}
          color="#fff"
          style={{
            alignSelf: "center",
            left: scaleFont(20),
            top: scaleFont(10),
            marginBottom: scaleFont(15),
          }}
          onPress={close}
        />

        <Text
          style={{
            fontSize: scaleFont(20),
            textAlign: "center",
            fontWeight: "500",
            color: "#fff",
            top: 12,
          }}
        >
          Preview
        </Text>
      </View>

      <ViewShot
        ref={viewShotRef}
        options={{ format: "jpg", quality: 1 }}
        style={{ flex: 1 }}
        onLayout={onViewShotLayout}
      >
        <Pdf
          source={{ uri: `file://${pdfFilePath}` }}
          onLoadComplete={(numberOfPages: number, filePath: string) => {
            console.log(`Number of pages: ${numberOfPages}`, filePath);
          }}
          onPageChanged={(page: number, numberOfPages: number) => {
            console.log(`Current page: ${page}`);
          }}
          onError={(error: any) => {
            console.log(error);
          }}
          onPressLink={(uri: string) => {
            console.log(`Link pressed: ${uri}`);
          }}
          style={styles.pdf}
        />
      </ViewShot>

      <View
        style={{
          flexDirection: "row",
          gap: 50,
          marginBottom: 50,
          top: 20,
          width: 160,
          backgroundColor: "#008541",
          borderRadius: 20,
          justifyContent: "center",
          padding: 10,
          alignSelf: "center",
        }}
      >
        <AntDesign
          name="printer"
          size={30}
          color="#fff"
          style={{ alignSelf: "center" }}
          onPress={handlePrint}
        />

        <AntDesign
          name="share-alt"
          size={30}
          color="#fff"
          style={{ alignSelf: "center" }}
          onPress={() => {
            if (isSharing) return;
            setModalVisible(true);
          }}
        />
      </View>

      {/* Modal for dropdown */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={{ flexDirection: "row" }}>
              <Text style={styles.modalText}>Share Options</Text>
              <AntDesign
                name="close"
                size={scaleFont(25)}
                color="grey"
                style={{
                  alignSelf: "center",
                  marginBottom: scaleFont(10),
                  left: scaleFont(80),
                }}
                onPress={() => setModalVisible(false)}
              />
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: scaleFont(20),
                top: scaleFont(10),
              }}
            >
              <TouchableOpacity
                disabled={isSharing}
                onPress={capturePageAsImage}
                style={{
                  flexDirection: "row",
                  gap: 10,
                  borderColor: "#008541",
                  backgroundColor: "#008541",
                  padding: 15,
                  borderRadius: 8,
                  opacity: isSharing ? 0.6 : 1,
                }}
              >
                <FontAwesome name="image" size={20} color="#fff" />
                <Text style={{ color: "#fff", fontSize: scaleFont(15) }}>
                  Share as Image
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={isSharing}
                onPress={ sharePDF}
                style={{
                  flexDirection: "row",
                  gap: 10,
                  borderColor: "#008541",
                  backgroundColor: "#008541",
                  padding: 15,
                  borderRadius: 8,
                  opacity: isSharing ? 0.6 : 1,
                }}
              >
                <FontAwesome name="file-pdf-o" size={20} color="#fff" />
                <Text style={{ color: "#fff", fontSize: scaleFont(15) }}>
                  Share as Pdf
                </Text>
              </TouchableOpacity>
            </View>

            {isSharing ? (
              <View style={{ marginTop: 12, alignItems: "center" }}>
                <ActivityIndicator size="small" />
                <Text style={{ marginTop: 8 }}>Preparing...</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
