import { scaleFont } from '@/constants/ScaleFont';
import { PermissionModal } from '@/constants/utils/permissionModal';
import { PostAudio } from '@/hooks/api/PostAudio';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Foundation from '@expo/vector-icons/Foundation';
import { useNavigation } from '@react-navigation/native';
import { RecordingPresets, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    Dimensions,
    Modal,
    PermissionsAndroid,
    Text,
    TouchableHighlight,
    View
} from 'react-native';
import { useDispatch } from 'react-redux';
import { styles } from './style';
const ScreenWidth = Dimensions.get('window').width;
const ScreenHeight = Dimensions.get('window').height;

export default function Record({ route }: any) {
  const { ClientId } = route.params ?? {};
  const { Path } = route.params ?? {};
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingStop, setIsRecordingStop] = useState(false);
  const [recordingPath, setRecordingPath] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [URL, setURL] = useState<any | null>(null);
  const [loading, setloading] = useState(false);
  const [Uploadmodal, setUploadmodalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const audioRecorderPlayer = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(URL);
  const status = useAudioPlayerStatus(player);
  const requestMicrophonePermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'App needs access to your microphone.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Microphone permission granted');
        // You can now use the microphone
      } else {
        console.log('Microphone permission denied');
        setPermissionModalVisible(true);
        // Handle the case where permission is denied
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const generateFilePath = () => {
    const timestamp = new Date().getTime();
    const targetDirectory = new Directory(Paths.document);
    const path = `${targetDirectory.uri}/${timestamp}.mp3`;
    setRecordingPath(path);
    console.log(path);

    return path;
  };
  const uploadAudio = async () => {
    console.log('filr', URL);
    const normalizedPath = URL.replace('file://', '');

    try {
      // Check if the image file exists
      const audioExists = await new File(URL).info();
      if (!audioExists.exists) {
        Alert.alert('Failed to get audio', 'Please record again');
        console.error('audio file does not exist:', URL);
        return;
      }
      const sourceFile = new File(URL);
      const targetFile = new File(recordingPath);
      await sourceFile.copy(targetFile);
      console.log('Normalized Path:', targetFile.uri);

      // Create FormData object
      const formData: any = new FormData();
      formData.append('audio', {
        uri: `file://${targetFile.uri}`,
        name: 'audio.mp3', // You can adjust the filename as needed
        type: 'audio/mpeg', // Adjust the MIME type if needed
      });
      formData.append('ClientID', ClientId);
      // Send the FormData object to the API
      const details = await PostAudio(formData, Path);
      dispatch({ type: 'POST_AUDIO_SUCCESS', payload: details });
      setloading(false);
      closeModal();
      console.log('details', details);
    } catch (error) {
      setUploadmodalVisible(false);
      Alert.alert('Failed to upload audio', 'Please try again');
      console.log('Error sharing audio with API:', error);
    }
  };
  const onStartRecord = async () => {
    await generateFilePath();
    try {
      await requestMicrophonePermission();

      await audioRecorderPlayer.prepareToRecordAsync();
      await audioRecorderPlayer.record();
      setIsRecording(true);
      setIsRecordingStop(false);
    } catch (error) {
      console.log('Error starting recording:', error);

    }
  };

  const onStopRecord = async () => {
    try {
      await audioRecorderPlayer.stop();
      setIsRecording(false);
      setIsRecordingStop(true);

      console.log('Recording saved at:', recordingPath);
      setURL(audioRecorderPlayer.uri);
      setUploadmodalVisible(true);
    } catch (error) {
      console.log('Error stopping recording:', error);
      Alert.alert('Failed to stop recording.', 'Please try again!');
    }
  };

  const onStopPlayback = async () => {
    try {
      player.pause();
      try {
        await player.seekTo(0);
      } catch (e) {
        // ignore
      }
      console.log('stopped');
      setIsPlaying(false);
      setIsRecordingStop(false);
      setUploadmodalVisible(true);
    } catch (error) {
      console.log('Error stopping player:', error);
    }
  };

  const onPlayRecord = async () => {
    try {
      if (status.didJustFinish || (!status.playing && status.duration > 0 && status.currentTime >= status.duration)) {
        try { await player.seekTo(0); } catch { }
      }
      setIsPlaying(true);
      player.play();

    } catch (error) {
      console.log('Error playing recording:', error);
    }
  };


  useEffect(() => {
    requestMicrophonePermission();
  }, []);
  const closeModal = () => {
    setUploadmodalVisible(false);
    setIsRecording(false);
    setRecordingPath('');
    setIsPlaying(false);
    setIsRecordingStop(false);
    navigation.goBack();
  };

  const alert = () => {
    Alert.alert('Warning!', 'Please Record First');
  };

  useEffect(() => {

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // Exit the app when back button is pressed on Myform page
        navigation.goBack();
        return true; // Prevent default behavior
      },
    );
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    if (status.didJustFinish) {
      onStopPlayback();
    }
  }, [status.didJustFinish]);
  return (
    <View style={styles.container}>
      <View >
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            {isRecording ? (
              <Text
                style={{
                  marginTop: 30,
                  fontWeight: 600,
                  color: 'black',
                  fontSize: scaleFont(17),
                }}>
                Recording in Progress
              </Text>
            ) : isPlaying ? (
              <Text
                style={{
                  marginTop: 30,
                  fontWeight: 600,
                  color: 'black',
                  fontSize: scaleFont(17),
                }}>
                Playback is running
              </Text>
            ) : isRecordingStop ? (
              <Text
                style={{
                  marginTop: 30,
                  fontWeight: 600,
                  color: 'black',
                  fontSize: scaleFont(17),
                }}>
                Record stoped{' '}
              </Text>
            ) : (
              <Text
                style={{
                  marginTop: 30,
                  fontWeight: 600,
                  color: 'black',
                  fontSize: scaleFont(16),
                }}>
                Click to start record
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: 50, left: 40, top: 50 }}>
              <FontAwesome5 name="stop-circle" size={40} color={isRecording ? 'red' : 'grey'}
                style={{ alignSelf: 'center' }}
                onPress={isRecording ? onStopRecord : alert}
              />

              <Foundation name="record" size={50} color={!isRecording ? 'red' : 'grey'}
                style={{ alignSelf: 'center' }}
                onPress={!isRecording ? onStartRecord : alert}
              />

              {isPlaying ? (
                <FontAwesome5 name="pause-circle" size={38} color={isPlaying ? 'red' : 'grey'}
                  style={{ alignSelf: 'center' }}
                  onPress={isPlaying ? onStopPlayback : alert}
                />
              ) : (
                <FontAwesome5 name="play-circle" size={38} color={isRecordingStop ? 'red' : 'grey'}
                  style={{ alignSelf: 'center' }}
                  onPress={isRecordingStop ? onPlayRecord : alert}
                />
              )}
              <AntDesign name="close-circle" size={30} color="black" style={{ bottom: 110, right: 50 }}
                onPress={closeModal} />

            </View>
          </View>
        </View>
      </View>
      <View style={styles.centeredView}>
        <Modal
          animationType="slide"
          transparent={true}
          visible={Uploadmodal}
          onRequestClose={() => {
            setUploadmodalVisible(!Uploadmodal);
          }}>
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              {loading ? (
                <>
                  <ActivityIndicator size="large" color="#00ff00" />
                  <Text style={{ color: 'black', fontSize: scaleFont(17) }}>
                    Please wait your audio is Uploading
                  </Text>
                </>
              ) : (
                <>
                  <Text style={{ color: 'black', fontSize: scaleFont(17) }}>
                    Click to upload your audio
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-evenly',
                      gap: 50,
                    }}>
                    <TouchableHighlight
                      style={{
                        backgroundColor: '#ff6d60',
                        width: 100,
                        marginTop: scaleFont(30),
                      }}
                      onPress={() => {
                        setUploadmodalVisible(false);
                      }}
                    >
                      <View style={{ alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                        <Text style={{ fontSize: scaleFont(17), color: '#fff' }}>Cancel</Text>
                      </View>
                    </TouchableHighlight>
                    <TouchableHighlight
                      style={{
                        backgroundColor: '#008541',
                        width: 100,
                        marginTop: scaleFont(30),
                      }}
                      onPress={() => {
                        setloading(true);
                        uploadAudio();
                      }}
                    >
                      <View style={{ alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                        <Text style={{ fontSize: scaleFont(17), color: '#fff' }}>Upload</Text>
                      </View>
                    </TouchableHighlight>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
      <PermissionModal visible={permissionModalVisible} onClose={() => setPermissionModalVisible(false)} />
    </View>
  );
}

