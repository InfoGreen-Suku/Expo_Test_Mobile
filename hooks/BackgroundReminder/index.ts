import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";
import BackgroundService from "react-native-background-actions";
import { makeApiCall } from "../api/backgroundAPICall";
import { cancelReminder, scheduleReminder } from "./ReminderModule";

const { SharedPreferences } = NativeModules;

const checkForNewDataAndAdd = async () => {
  // const Details = [
  //   {
  //     "id": 1,
  //     "Taskname": "Task One",
  //     "Description": "This is the description for Task One.",
  //     "status": "pending",
  //     "date": "2025-01-21T08:27"
  //   },
  //   {
  //     "id": 2,
  //     "Taskname": "Task two",
  //     "Description": "This is the description for Task Two.",
  //     "status": "pending",
  //     "date": "2025-01-21T08:30"
  //   },
  //   {
  //     "id": 3,
  //     "Taskname": "Task Three",
  //     "Description": "This is the description for Task Three.",
  //     "status": "pending",
  //     "date": "2025-01-21T08:32"
  //   },
  //   {
  //     "id": 4,
  //     "Taskname": "Task Four",
  //     "Description": "This is the description for Task Four",
  //     "status": "pending",
  //     "date": "2025-01-21T08:35"
  //   },
  //   {
  //     "id": 5,
  //     "Taskname": "Task Five",
  //     "Description": "This is the description for Task Five",
  //     "status": "pending",
  //     "date": "2025-01-21T08:35"
  //   },
  //   {
  //     "id": 6,
  //     "Taskname": "Task Six",
  //     "Description": "This is the description for Task Six",
  //     "status": "pending",
  //     "date": "2025-01-21T08:50"
  //   },
  //   {
  //     "id": 7,
  //     "Taskname": "Task Six",
  //     "Description": "This is the description for Task Six",
  //     "status": "pending",
  //     "date": "2025-01-21T12:18"
  //   },
  // ];

  try {
    const Details = await makeApiCall();
    if (Details && Array.isArray(Details)) {
      const sanitizedDetails = Details.map((item) => {
        const reminder: any = {
          id: parseInt(item.id, 10), // Convert id to number
          message: String(item.message),
          date: String(item.date), // Ensure the date is in the correct format
        };

        reminder.status = "pending";
        reminder.snoozeDate = item.date;

        return reminder;
      });

      await updateRemindersWithNewData(sanitizedDetails);
    } else {
      console.error("Invalid or empty data returned from API");
    }
  } catch (error) {
    console.error("Error in checkForNewDataAndAdd:", error);
  }
};

// Initialize event listeners
// export const initializeEventListeners = () => {
//   console.log("initializeEventListeners");

//   // Handle snooze events from Java
//   DeviceEventEmitter.addListener('onSnooze', async (event:any) => {
//     console.log("onSnooze",event);

//     try {
//       const reminders = await getReminderData();
//       const updatedReminders = reminders.map((task:any) => {
//         if (task.message === event.message) {
//           const newDate = new Date(new Date().getTime() + 2 * 60000);
//           return { ...task, snoozeDate: newDate.toISOString().slice(0, 16) };
//         }

//         return task;
//       });

//       await saveReminderData(updatedReminders);
//       console.log(`Reminder ${event.taskId} snoozed for 5 minutes`);
//     } catch (error) {
//       console.error('Error handling snooze:', error);
//     }
//   });

//   // Handle dismiss events from Java
//   DeviceEventEmitter.addListener('onDismiss', async (event:any) => {
//     console.log("onDismiss",event);
//     try {
//       const reminders = await getReminderData();
//       const updatedReminders = reminders.map((task:any) => {
//         if (task.message === event.message) {
//           return { ...task, status: 'completed' };
//         }
//         return task;
//       });
//       await saveReminderData(updatedReminders);
//       console.log(`Reminder ${event.taskId} dismissed`);
//     } catch (error) {
//       console.error('Error handling dismiss:', error);
//     }
//   });
// };

const updateRemindersWithNewData = async (newData: any) => {
  try {
    const existingReminders = (await getReminderData()) || [];

    const newReminders = newData.filter(
      (newItem: any) =>
        !existingReminders.some(
          (existingItem: any) => existingItem.date === newItem.date
        )
    );

    if (newReminders.length > 0) {
      const formattedNewReminders = newReminders.map((item: any) => ({
        id: parseInt(item.id, 10),
        message: String(item.message),
        status: String(item.status),
        date: String(item.date), // Ensure the date is in the correct format
        snoozeDate: String(item.snoozeDate),
      }));

      const updatedReminders = [...existingReminders, ...formattedNewReminders];

      await saveReminderData(updatedReminders);
      // Schedule alarms for new reminders
      formattedNewReminders.forEach((item: any) => {
        const triggerMs = new Date(item.snoozeDate).getTime();
        if (!Number.isNaN(triggerMs)) {
          scheduleReminder(String(item.message), triggerMs);
        }
      });
      console.log("New reminders added:", formattedNewReminders);
    } else {
      console.log("No new reminders to add.");
    }
  } catch (error) {
    console.error("Error updating reminders with new data:", error);
  }
};

const initializeReminders = async () => {
  try {
    const storedReminders = await AsyncStorage.getItem("reminder");
    if (!storedReminders) {
      const defaultDetails = await makeApiCall(); // Fetch initial data from API
      if (defaultDetails && Array.isArray(defaultDetails)) {
        const sanitizedDetails = defaultDetails.map((item) => {
          const reminder: any = {
            id: parseInt(item.id, 10), // Convert id to number
            message: String(item.message),
            date: String(item.date),
          };

          reminder.status = "pending";
          reminder.snoozeDate = item.date;
          return reminder;
        });

        await AsyncStorage.setItem(
          "reminder",
          JSON.stringify(sanitizedDetails)
        );
        console.log("Initialized AsyncStorage with fetched Details.");
        // Schedule alarms for the initialized reminders
        sanitizedDetails.forEach((item: any) => {
          const triggerMs = new Date(item.snoozeDate).getTime();
          if (!Number.isNaN(triggerMs)) {
            scheduleReminder(String(item.message), triggerMs);
          }
        });
      } else {
        console.error("Failed to initialize reminders with fetched Details.");
      }
    } else {
      console.log("Reminders already exist in AsyncStorage.");
    }
  } catch (error) {
    console.error("Error initializing reminders:", error);
  }
};

const sleep = (time: any) =>
  new Promise((resolve) => setTimeout(resolve, time));

const getReminderData = async () => {
  const reminder = await AsyncStorage.getItem("reminder");
  return reminder ? JSON.parse(reminder) : [];
};

const saveReminderData = async (reminderDetails: any) => {
  await AsyncStorage.setItem("reminder", JSON.stringify(reminderDetails));
};

const checkForReminderActions = async () => {
  try {
    if (Platform.OS === "android") {
      const lastAction = await SharedPreferences.getString(
        "last_reminder_action",
        ""
      );
      const lastMessage = await SharedPreferences.getString(
        "last_reminder_message",
        ""
      );
      const lastTimestamp = await SharedPreferences.getLong(
        "last_reminder_timestamp",
        0
      );
      const lastSnoozeMinutesRaw = await SharedPreferences.getInt(
        "last_snooze_minutes",
        2
      );
      console.log("lastAction", lastAction);
      console.log("lastMessage", lastMessage);
      console.log("lastTimestamp", lastTimestamp);

      if (lastAction && lastMessage && lastTimestamp > 0) {
        console.log("Found reminder action:", {
          lastAction,
          lastMessage,
          lastTimestamp,
        });

        const reminders = await getReminderData();
        let updatedReminders;

        if (lastAction === "onSnooze") {
          const snoozeMinutes = Math.max(1, Number(lastSnoozeMinutesRaw || 2));
          updatedReminders = reminders.map((task: any) => {
            if (task.message === lastMessage) {
              const newDate = new Date(
                new Date().getTime() + snoozeMinutes * 60000
              );
              return {
                ...task,
                snoozeDate: newDate.toISOString().slice(0, 16),
                status: "pending",
              };
            }
            return task;
          });
          // Schedule new snooze alarm immediately to avoid relying on polling cadence
          const snoozeMs = new Date(new Date().getTime() + snoozeMinutes * 60000).getTime();
          scheduleReminder(String(lastMessage), snoozeMs);
        } else if (lastAction === "onDismiss") {
          updatedReminders = reminders.map((task: any) => {
            if (task.message === lastMessage) {
              return { ...task, status: "completed" };
            }
            return task;
          });
          // Cancel any scheduled alarm for this reminder
          cancelReminder(String(lastMessage));
        }

        if (updatedReminders) {
          await saveReminderData(updatedReminders);
          // Clear the action after processing
          await SharedPreferences.removeItem("last_reminder_action");
          await SharedPreferences.removeItem("last_reminder_message");
          await SharedPreferences.removeItem("last_reminder_timestamp");
          await SharedPreferences.removeItem("last_snooze_minutes");
          console.log("Reminder action processed and cleared");
        }
      }
    }
  } catch (error) {
    console.error("Error checking reminder actions:", error);
  }
};

const reminderTask = async (taskData: any) => {
  const { delay } = taskData;
  console.log("Task Delay:", delay);

  let lastApiCallTime = Date.now();
  console.log("Init", lastApiCallTime);

  await initializeReminders();

  await new Promise(async (resolve) => {
    while (BackgroundService.isRunning()) {
      // Check for reminder actions
      await checkForReminderActions();

      // Check for reminders every 30 seconds
      const currentTime = new Date().toISOString().slice(0, 16);
      console.log("Current Time:", currentTime);

      const reminderDetails = await getReminderData();
      console.log("reminderDetails", reminderDetails);

      reminderDetails.forEach((reminder: any) => {
        if (reminder.status === "pending") {
          const due = currentTime >= String(reminder.snoozeDate).slice(0, 16);
          if (due) {
            scheduleReminder(String(reminder.message), Date.now() + 1000);
          }
        }
      });

      // Check if it's time to make the API call
      const timeSinceLastApiCall = Date.now() - lastApiCallTime;
      console.log("currentapi", timeSinceLastApiCall);

      if (timeSinceLastApiCall >= 3 * 60 * 1000) {
        console.log("Making the API call...");
        await checkForNewDataAndAdd();
        lastApiCallTime = Date.now();
        console.log("updated", lastApiCallTime);
      }

      await sleep(delay);
    }
    resolve(void 0);
  });
};

const taskConfig = {
  taskName: "ReminderTask",
  taskTitle: "Reminder",
  taskDesc: "Your reminders are being checked",
  taskIcon: {
    name: "ic_stat_onesignal_default",
    type: "drawable",
    package: "com.test.app",
  },
  color: "#008541",
  parameters: {
    delay: 30000,
  },
  allowExecutionInForeground: true,
};

export const startReminderService = async () => {
  // Initialize event listeners when starting the service
  // initializeEventListeners();
  try {
    if (BackgroundService.isRunning()) {
      console.log("Background Service already running");
      return;
    }
    await BackgroundService.start(
      (taskdata: any) => reminderTask(taskdata),
      taskConfig
    );
    console.log("Background Service started");
  } catch (err: any) {
    console.error(err);
  }
};

export const stopReminder = async () => {
  if (BackgroundService.isRunning()) {
    await BackgroundService.stop();
    console.log("Background task stopped:");
  }
};

// const activateReminder = (reminderDetails:any) => {
//   // initializeNotifications(reminderDetails);
//   showReminder(reminderDetails.message);
// };
