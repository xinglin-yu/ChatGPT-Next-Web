import JSZip from "jszip";
import axios from "axios";
import { getServerSideConfig } from "../config/server";

import zBotServiceClient, {
  LocalStorageKeys,
} from "../zbotservice/ZBotServiceClient";
import { EAzureSpeechPrice } from "../azure-speech/AzureRoles";

const config = getServerSideConfig();

export enum VideoFetchStatus {
  // Empty = "",
  Succeeded = "Succeeded",
  Failed = "Failed",
  Loading = "Loading",
  // Error = "Error",
}

const subscriptionKey = config.speechAvatarSubscriptionKey;
const serviceRegion = config.speechAvatarServiceRegion;

export interface ISubmitAvatarSetting {
  Voice: string;
}

export class VideoAudioRequestResponse {
  status: string = "";
  data: string = "";
  duration: number = 0;
  submitting: boolean = false;

  caption?: string = "";
  lastSegment?: number = -1;

  public static reset = (item: VideoAudioRequestResponse): void => {
    item.status = "";
    item.data = "";
    item.duration = 0;
    item.submitting = false;
    item.caption = "";
    item.lastSegment = -1;
  };
}

export const onSynthesisAvatar = async (
  inputText: string,
  setting: ISubmitAvatarSetting,
): Promise<VideoAudioRequestResponse> => {
  const header = {
    // Accept: "application/json",
    "Ocp-Apim-Subscription-Key": subscriptionKey,
    "Content-Type": "application/json",
  };
  const url = `https://${serviceRegion}.customvoice.api.speech.microsoft.com/api/texttospeech/3.1-preview1/batchsynthesis/talkingavatar`;

  const payload = {
    displayName: "speech avatar speaking", // TODO: add user email
    description: "",
    textType: "PlainText",
    inputs: [
      {
        text: inputText,
      },
    ],
    synthesisConfig: {
      voice: setting.Voice,
    },
    properties: {
      talkingAvatarCharacter: "lisa", // # currently only one platform character (lisa)
      talkingAvatarStyle: "casual-sitting", // # chosen from 5 styles (casual-sitting, graceful-sitting, graceful-standing, technical-sitting, technical-standing)
      // videoFormat: "webm", // # mp4 or webm, webm is required for transparent background
      // videoCodec: "vp9", // # hevc, h264 or vp9, vp9 is required for transparent background; default is hevc
      // subtitleType: "soft_embedded",
      videoFormat: "mp4", // # mp4 or webm, webm is required for transparent background
      videoCodec: "h264", // # hevc, h264 or vp9, vp9 is required for transparent background; default is hevc
      subtitleType: "hard_embedded",
      backgroundColor: "white", // # white or transparent
    },
  };

  const res = new VideoAudioRequestResponse();

  try {
    const response = await axios.post(url, payload, {
      headers: header,
    });

    if (response.status >= 400) {
      console.error(`Failed to submit batch avatar synthesis job: ${response}`);
      res.status = VideoFetchStatus.Failed;
      res.data = response.data;
      return res;
    }

    const job_id = response.data.id;
    console.log(`Job ID: ${job_id}`);

    while (true) {
      const response = await axios.get(`${url}/${job_id}`, {
        headers: header,
      });
      const currentStatus = response.data.status;
      if (currentStatus >= 400) {
        console.error(`Failed to get batch avatar synthesis job: ${response}`);
      }
      if (currentStatus === "Succeeded") {
        const duration = Math.ceil(
          response.data.properties.durationInTicks / 10000000,
        );

        // 扣费
        const userEmail = localStorage.getItem(LocalStorageKeys.userEmail);
        const realCost = Math.ceil(duration * EAzureSpeechPrice.TTSAvatar);
        zBotServiceClient.updateRequest(userEmail ?? "", realCost);
        console.log(
          `onPreviewVideo: duration=${duration}, realCost=${realCost}`,
        );

        res.status = VideoFetchStatus.Succeeded;
        res.data = response.data.outputs.result;
        res.duration = duration;
        return res;
      }
      if (currentStatus === "Failed") {
        res.status = VideoFetchStatus.Failed;
        res.data = response.data;
        return res;
      } else {
        // console.log(
        //   `batch avatar synthesis job is still running, status [${currentStatus}]`,
        // );
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待1秒
      }
    }
  } catch (error) {
    console.error(`Failed to submit batch avatar synthesis job: ${error}`);
    res.status = VideoFetchStatus.Failed;
    res.data = error as string;
    return res;
  }
};

export const onSynthesisAudio = async (
  inputText: string,
  setting: ISubmitAvatarSetting,
): Promise<VideoAudioRequestResponse> => {
  const header = {
    Accept: "application/json",
    "Ocp-Apim-Subscription-Key": subscriptionKey,
    "Content-Type": "application/json",
  };
  const url = `https://${serviceRegion}.customvoice.api.speech.microsoft.com/api/texttospeech/3.1-preview1/batchsynthesis`;

  const payload = {
    displayName: "speech audio synthesis",
    description: "",
    textType: "PlainText",
    inputs: [
      {
        text: inputText,
      },
    ],
    synthesisConfig: {
      voice: setting.Voice,
    },
    properties: {
      outputFormat: "audio-24khz-160kbitrate-mono-mp3",
    },
  };

  const res = new VideoAudioRequestResponse();

  try {
    const response = await axios.post(url, payload, {
      headers: header,
    });

    if (response.status >= 400) {
      console.error(`Failed to submit batch avatar synthesis job: ${response}`);
      res.status = VideoFetchStatus.Failed;
      res.data = response.data;
      return res;
    }

    const job_id = response.data.id;
    console.log(`Job ID: ${job_id}`);

    while (true) {
      const response = await axios.get(`${url}/${job_id}`, {
        headers: header,
      });
      const currentStatus = response.data.status;
      if (currentStatus >= 400) {
        console.error(`Failed to get batch avatar synthesis job: ${response}`);
      }
      if (currentStatus === "Succeeded") {
        // 下载.zip文件并解压展示其中的.mp3文件
        const fetchAndUnzipMP3 = async (zipUrl: string) => {
          try {
            const response = await axios.get(zipUrl, { responseType: "blob" });
            const zipBlob = response.data;

            const jszip = new JSZip();
            const zip = await jszip.loadAsync(zipBlob);

            // 假定.zip文件中只有一个.mp3文件
            const mp3File = Object.keys(zip.files).find((fileName) =>
              fileName.endsWith(".mp3"),
            );

            if (mp3File) {
              const mp3Blob = await zip.files[mp3File].async("blob");
              const mp3Url = URL.createObjectURL(mp3Blob);
              console.log("mp3Url: ", mp3Url);
              return mp3Url;
            }
          } catch (error) {
            console.error("Error fetching or unzipping MP3:", error);
          }
        };

        const mp3Url = await fetchAndUnzipMP3(response.data.outputs.result);
        const duration = Math.ceil(
          response.data.properties.durationInTicks / 10000000,
        );

        // 扣费
        const userEmail = localStorage.getItem(LocalStorageKeys.userEmail);
        const realCost = Math.ceil(duration * EAzureSpeechPrice.TTSVoice);
        zBotServiceClient.updateRequest(userEmail ?? "", realCost);
        console.log(
          `onSynthesisAudio: duration=${duration}, realCost=${realCost}`,
        );

        res.status = VideoFetchStatus.Succeeded;
        res.data = mp3Url as string;
        res.duration = duration;
        return res;
      }
      if (currentStatus === "Failed") {
        res.status = VideoFetchStatus.Failed;
        res.data = response.data;
        return res;
      } else {
        // console.log(
        //   `batch avatar synthesis job is still running, status [${currentStatus}]`,
        // );
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待1秒
      }
    }
  } catch (error) {
    console.error(`Failed to submit batch avatar synthesis job: ${error}`);
    res.status = VideoFetchStatus.Failed;
    res.data = error as string;
    return res;
  }
};

/*
Public preview: 2023/12
100 words = 40s video => GenerateTime: 40 seconds
1 word => 0.4 seconds

Previous private preview: 2023/09
100 words = 48s video => GenerateTime: 4 miniutes = 240 seconds
1 word => 2.4 seconds

100 words = 1$ = 7.2 RMB = 72 Coins
1 words => 0.7 Coins
*/
