import { scaleFont } from '@/constants/ScaleFont';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useNavigation } from '@react-navigation/native';
import * as ExpoPrint from 'expo-print';
import React, { useEffect } from 'react';
import { Alert, BackHandler, Text, View } from 'react-native';
import Pdf from 'react-native-pdf';
import Share from 'react-native-share';

import { styles } from './style';
export default function PDF({ route }: any) {
    // pdfpath params is getting from the webview components
    const { pdfPath } = route.params ?? {};
    const pdfFilePath = pdfPath;
    const navigation = useNavigation<any>();
    const [isMounted, setIsMounted] = React.useState(true);
    useEffect(() => {
        const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
            navigation.goBack();
            return true;
        });

        return () => {
            backHandler.remove();
        };
    }, []);
    // capture screenshot for sharing jpg.
    useEffect(() => {
        return () => {
            setIsMounted(false);
        };
    }, []);


    const Print = async () => {
        try {
            await ExpoPrint.printAsync({
                uri: pdfFilePath
            });
        } catch (error) {
            console.log('Error printing:', error);
            Alert.alert('Error', 'Failed to print document');
        };
    };


    const sharePDF = (pdfPath: any) => {
        console.log('pdfPath', pdfPath);
        const shareOptions = {
            // `pdfPath` should already be a proper file:// or content:// URI
            url: pdfPath,
            type: 'application/pdf',
            title: 'Share PDF File',
        };

        Share.open(shareOptions)
            .then((res) => {
                console.log(res);
            })
            .catch((err) => {
                err && console.log(err);
            });
    };
    //handle BackButton for moving back to the previous page or exit app.
    const close = () => {
        navigation.goBack();
    };
    return (
        <View style={styles.container}>

            <View style={{ flexDirection: 'row', gap: 50, marginBottom: 30, backgroundColor: '#008541', width: '100%', height: '7%', }} >
                <AntDesign name="close" size={scaleFont(25)} color="#fff" style={{ alignSelf: 'center', left: scaleFont(20), top: scaleFont(10), marginBottom: scaleFont(15) }}
                    onPress={close} />
                <Text style={{ fontSize: scaleFont(20), textAlign: 'center', fontWeight: '500', color: "#fff", top: 12 }}>Preview</Text>
            </View>

            <Pdf
                source={{ uri: `${pdfFilePath}` }}
                onError={(error) => {
                    console.log(error);
                }}

                style={styles.pdf}
            />
            <View style={{ flexDirection: 'row', gap: 50, marginBottom: 50, top: 20, width: 200, backgroundColor: "#008541", borderRadius: 20, justifyContent: 'center', padding: 10, alignSelf: 'center' }} >
                <AntDesign name="printer" size={30} color="#fff" style={{ alignSelf: 'center' }}
                    onPress={Print} />

                <AntDesign name="share-alt" size={30} color="#fff" style={{ alignSelf: 'center' }}
                    onPress={() => sharePDF(pdfFilePath)} />

            </View>
        </View>
    )
}
