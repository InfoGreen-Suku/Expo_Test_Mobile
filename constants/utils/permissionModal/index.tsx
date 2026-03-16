import { Linking, Modal, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./style";

export const PermissionModal = ({ visible, onClose }: { visible: boolean, onClose: () => void }) => {

    const handleClose = () => {
        Linking.openSettings();
        onClose();
    }

    return (
        <View >
            <Modal animationType="slide" transparent={true} visible={visible}>
                <View style={styles.modalView}>
                    <Text style={styles.modalText1}>
                        Permission has been denied multiple times.
                    </Text>
                    <Text style={styles.modalText2}>
                        To use this feature, please enable the permission manually from your device settings.
                    </Text>

                    <TouchableOpacity
                        style={styles.modalBtn}
                        onPress={handleClose}>
                        <Text style={styles.modalBtnText}>Ok</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    )
}