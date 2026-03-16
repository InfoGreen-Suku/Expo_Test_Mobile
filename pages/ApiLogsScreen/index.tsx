// ApiLogsScreen.tsx
import { scaleFont } from "@/constants/ScaleFont";
import { clearLogs, getLogs } from "@/hooks/logger/apiLogger";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { BackHandler, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./style";

export default function ApiLogsScreen() {
    const [logs, setLogs] = useState("");
    const navigation = useNavigation<any>();
    const loadLogs = async () => {
        const content = await getLogs();
        setLogs(content);
    };

    useEffect(() => {
        loadLogs();
    }, []);

    useEffect(() => {
        BackHandler.addEventListener('hardwareBackPress', () => {
            navigation.goBack();
            return true;
        });
    }, []);
    return (
        <View style={styles.container}>
            <View style={{ flexDirection: 'row', gap: 50, backgroundColor: '#008541', width: '100%', height: '7%', }} >
                <AntDesign name="close" size={scaleFont(25)} color="#fff" style={{ alignSelf: 'center', left: scaleFont(20), top: scaleFont(10), marginBottom: scaleFont(15) }}
                    onPress={() => navigation.goBack()} />
                <Text style={{ fontSize: scaleFont(20), textAlign: 'center', fontWeight: '500', color: "#fff", top: 12 }}>API Logs</Text>
            </View>
            <ScrollView style={{ flex: 1, backgroundColor: "#fff",padding: 10 }} showsVerticalScrollIndicator={false}>
                <Text style={{ color: "#000", fontSize: scaleFont(12) }}>{logs}</Text>
            </ScrollView>
            <View style={{ flexDirection: 'row',gap: 10, justifyContent: 'center', alignItems: 'center' }} >

                <TouchableOpacity style={{ backgroundColor: '#008541', padding: 8, width: '45%', borderRadius: 10, marginBottom: scaleFont(15), alignSelf: 'center' }} onPress={clearLogs}>
                    <Text style={{ color: '#fff', textAlign: 'center', fontSize: scaleFont(17) }}>Clear Logs</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ backgroundColor: '#008541', padding: 8, width: '45%', borderRadius: 10, marginBottom: scaleFont(15), alignSelf: 'center' }} onPress={loadLogs}>
                    <Text style={{ color: '#fff', textAlign: 'center', fontSize: scaleFont(17) }}>Refresh Logs</Text>
                </TouchableOpacity>
            </View>
        </View>

    );
}
