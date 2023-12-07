import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  LinearProgress,
} from "@mui/material";
import "react-circular-progressbar/dist/styles.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LabelList,
} from "recharts";
import { useAppConfig, useChatStore } from "../store";
import Locale from "../locales";

import ResetIcon from "../icons/reload.svg";

import IconButtonMui from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import ButtonGroup from "@mui/joy/ButtonGroup";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VerifiedIcon from "@mui/icons-material/Verified";
import ReplayCircleFilledIcon from "@mui/icons-material/ReplayCircleFilled";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Tabs from "@mui/material/Tabs";
import PhoneIcon from "@mui/icons-material/Phone";
import FavoriteIcon from "@mui/icons-material/Favorite";
import PersonPinIcon from "@mui/icons-material/PersonPin";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import CircularProgress from "@mui/material/CircularProgress";

import {
  audioSpeechToText,
  speechRecognizer,
  speechSynthesizer,
} from "../cognitive/speech-sdk";

import {
  IQuestionItem,
  ImpromptuSpeechInput,
  ImpromptuSpeechPrompts,
  ImpromptuSpeechRoles,
  ImpromptuSpeechStage,
  SpeechDefaultLangugage,
} from "./ISpeechRoles";
import ReactMarkdown from "react-markdown";
import { LinearProgressWithLabel } from "./ISpeech-Common";
import {
  AudioRecorder,
  StageStatus,
} from "../cognitive/speech-audioRecorderClass";
import { useAudioRecorder } from "../cognitive/speech-audioRecorder";

import _ from "lodash";
import { useNavigate } from "react-router-dom";

import styles_chat from "../components/chat.module.scss";
import styles_tm from "../toastmasters/toastmasters.module.scss";
import { List, ListItem, showPrompt, showToast } from "../components/ui-lib";
import { IconButton } from "../components/button";
import { Markdown } from "../components/exporter";
import { ChatAction, useScrollToBottom } from "../components/chat";
import SendWhiteIcon from "../icons/send-white.svg";

import { ChatTitle, BorderLine, ChatUtility } from "./chat-common";

import styles from "./ISpeech.module.scss";
import GaugeChart from "./ISpeech-Common";

export const FreePersonalQuestionPage = (props: {
  scrollRef: React.RefObject<HTMLDivElement>;
  impromptuSpeechInput: ImpromptuSpeechInput;
}) => {
  let { scrollRef, impromptuSpeechInput } = props;
  const questionItems = impromptuSpeechInput.QuestionItems;
  const questionNums = questionItems.length;

  const [evaluationRole, setEvaluationRole] = React.useState<string>(
    ImpromptuSpeechRoles.Scores,
  );

  const chatStore = useChatStore();
  const [session, sessionIndex] = useChatStore((state) => [
    state.currentSession(),
    state.currentSessionIndex,
  ]);
  const config = useAppConfig();

  // 需要实时刷新页面的, 就用useState, 否则直接用内部状态
  // local state used for reder page
  const [currentNum, setCurrentNum] = useState(0);
  const [questionItem, setQuestionItem] = useState<IQuestionItem>(
    questionItems[currentNum],
  );

  const [evaluating, setEvaluating] = useState(
    Object.keys(questionItem.Evaluations).length > 0,
  );
  const [speechTime, setSpeechTime] = useState(questionItem.SpeechTime);
  const [recordingStatus, setRecordingStatus] = useState(
    questionItem.StageStatus,
  );
  const [recorder, setRecorder] = useState(
    new AudioRecorder(setRecordingStatus),
  );

  // const [recorder, setRecorder] = useState(questionItem.Recorder);
  // useEffect(() => {
  //   recorder.setStatusChangeFunction(setRecordingStatus);
  // }, [recorder])

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (recordingStatus === StageStatus.Recording) {
      intervalId = setInterval(() => {
        setSpeechTime((prevTime) => prevTime + 1); // 用于刷新页面
        questionItem.SpeechTime = speechTime; // 用于保存状态
      }, 1000);
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [currentNum, questionItem, recordingStatus, speechTime]);

  // useEffect(() => {
  //   let intervalId: NodeJS.Timeout;
  //   if (recordingStatus === StageStatus.Recording) {
  //     intervalId = setInterval(() => {
  //       chatStore.updateCurrentSession(
  //         (session) => (
  //           (questionItem.SpeechTime += 1)
  //         ),
  //       );
  //     }, 1000);
  //   }

  //   return () => {
  //     clearInterval(intervalId);
  //   };
  // }, [chatStore, questionItem, recordingStatus]);

  const appendUserInput = (newState: string): void => {
    // 每次按下button时 换行显示
    if (questionItem.Speech === "") {
      questionItem.Speech = newState;
    } else {
      questionItem.Speech += "\n" + newState;
    }
  };

  const onRecord = () => {
    recorder.startRecording();
    speechRecognizer.startRecording(appendUserInput, SpeechDefaultLangugage);
  };

  const onPause = () => {
    recorder.pauseRecording();
    speechRecognizer.stopRecording();
  };

  const onPlay = () => {
    const audioData = questionItem.SpeechAudio as Blob;
    if (audioData && audioData.size > 0) {
      const audioUrl = URL.createObjectURL(audioData);
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const onReset = () => {
    // 清存储
    // questionItem.ResetCurrent // TODO:Error: is not a function
    questionItem.Speech = "";
    questionItem.SpeechTime = 0;
    questionItem.SpeechAudio = null;
    questionItem.Score = 0;
    questionItem.Scores = [];
    questionItem.Evaluations = {};
    // questionItem.StageStatus = StageStatus.Start;

    // 改状态
    setSpeechTime(0);
    setRecordingStatus(StageStatus.Start);
    setEvaluating(false);
    recorder.resetRecording();
  };

  const onStop = () => {
    recorder.stopRecording();
  };

  // TODO: 打分还不太准确
  const onScore = async () => {
    recorder.stopRecording();
    questionItem.SpeechAudio = recorder.getAudioData();

    // questionItem.Speech = questionItem.SampleSpeech
    // questionItem.Speech = "it is nothing, uh, um, oh change to another questions"
    // questionItem.Speech = "things have change a lot by internet, uh, um, oh a lot"
    // questionItem.Speech = "The internet has revolutionized communication and connectivity, uh, um, oh in ways we could have never imagined. "
    console.log("onScore: Speech: ", questionItem.Speech);

    // reset status from 0
    chatStore.resetSessionFromIndex(2);

    let ask = ImpromptuSpeechPrompts.GetScorePrompt(
      currentNum,
      questionItem.Question,
      questionItem.Speech,
    );
    chatStore.onUserInput(ask);

    await chatStore.getIsFinished();
    const response = session.messages[session.messages.length - 1].content;
    let scores: number[] = [];
    try {
      scores = JSON.parse(response);
    } catch (error) {
      showToast(`score are not correct format, please try again.`);
      return;
    }

    scores.push(getTimeScore(speechTime));
    console.log("onScore: all scores: ", scores);
    const averageScore = Math.round(
      scores.reduce((acc, val) => acc + val, 0) / scores.length,
    );

    const scoreRoles = ImpromptuSpeechPrompts.GetScoreRoles();
    const scoresRecord: { subject: string; score: number }[] = [];
    for (let i = 0; i < scoreRoles.length; i++) {
      scoresRecord.push({ subject: scoreRoles[i], score: scores[i] });
    }

    chatStore.updateCurrentSession(
      (session) => (
        (questionItem.Score = averageScore),
        (questionItem.Scores = scoresRecord)
      ),
    );
  };

  const getTimeScore = (timeSeconds: number): number => {
    /*
      the time and score has below relations: 
      (0,0), (60,60), (90,80), (120,100), (150, 0)
      So we can get linear time model
    */
    if (timeSeconds <= 60) return timeSeconds;
    if (timeSeconds <= 90) return Math.round((2 / 3) * timeSeconds + 20);
    if (timeSeconds <= 120) return Math.round((2 / 3) * timeSeconds + 20);
    if (timeSeconds <= 150) return Math.round(((150 - timeSeconds) * 10) / 3);
    return 0;
  };

  const evaluationRoles = ImpromptuSpeechPrompts.GetEvaluationRoles();

  const onRegenerateSampleSpeech = async () => {
    chatStore.updateCurrentSession(
      (session) => (questionItem.SampleSpeech = ""),
    );
    const ask = ImpromptuSpeechPrompts.GetSampleSpeechPrompt(
      currentNum,
      questionItem.Question,
    );
    chatStore.onUserInput(ask);
    await chatStore.getIsFinished();
    const response = session.messages[session.messages.length - 1].content;
    chatStore.updateCurrentSession(
      (session) => (questionItem.SampleSpeech = response),
    );
    chatStore.resetSessionFromIndex(2);
  };

  const onRegenerateEvaluation = async (role: string) => {
    setEvaluating(true);

    chatStore.updateCurrentSession(
      (session) => delete questionItem.Evaluations[role],
    );
    let propmts = ImpromptuSpeechPrompts.GetEvaluationPrompts(
      currentNum,
      questionItem.Question,
      questionItem.Speech,
    );

    chatStore.onUserInput(propmts[role]);
    await chatStore.getIsFinished();
    const response = session.messages[session.messages.length - 1].content;
    chatStore.updateCurrentSession(
      (session) => (questionItem.Evaluations[role] = response),
    );
    chatStore.resetSessionFromIndex(2);
    setEvaluating(false);
  };

  const onEvaluation = async (event: { preventDefault: () => void }) => {
    if (questionItem.Speech === "" || questionItem.Speech === undefined) {
      event.preventDefault();
      showToast("Speech is empty");
      return;
    }

    setEvaluating(true);

    let propmts = ImpromptuSpeechPrompts.GetEvaluationPrompts(
      currentNum,
      questionItem.Question,
      questionItem.Speech,
    );

    // reset
    chatStore.updateCurrentSession(
      (session) => (questionItem.Evaluations = {}),
    );

    for (const role of evaluationRoles) {
      chatStore.onUserInput(propmts[role]);
      await chatStore.getIsFinished();
      const response = session.messages[session.messages.length - 1].content;
      // console.log("response: ", response);
      chatStore.updateCurrentSession(
        (session) => (questionItem.Evaluations[role] = response),
      );
    }
    await chatStore.getIsFinished();

    chatStore.resetSessionFromIndex(2);
    setEvaluating(false);
  };

  const handleChangeEvaluationRole = (
    event: React.SyntheticEvent,
    newValue: string,
  ) => {
    setEvaluationRole(newValue);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const onReturn = () => {
    chatStore.updateCurrentSession(
      (session) =>
        (impromptuSpeechInput.ActivePage = ImpromptuSpeechStage.Start),
    );
  };

  const onPreviousQuestion = () => {
    if (currentNum > 0) {
      // then transform to next
      setCurrentNum(currentNum - 1);
      updateQuestionItem(currentNum - 1);
    }
  };
  const onNextQuestion = () => {
    if (currentNum < questionNums - 1) {
      setCurrentNum(currentNum + 1);
      updateQuestionItem(currentNum + 1);
    }
  };

  const updateQuestionItem = (nextNum: number) => {
    // 1st save current status
    questionItem.StageStatus = recordingStatus;
    // questionItem.SpeechAudio = recorder.getAudioData();
    recorder.resetRecording();

    // 当currentNum变化时, 更新初始值
    setQuestionItem(questionItems[nextNum]);
    setEvaluating(Object.keys(questionItems[nextNum].Evaluations).length > 0);
    setSpeechTime(questionItems[nextNum].SpeechTime);

    setRecordingStatus(questionItems[nextNum].StageStatus);
  };

  const onReport = () => {
    chatStore.updateCurrentSession(
      (session) =>
        (impromptuSpeechInput.ActivePage = ImpromptuSpeechStage.Report),
    );
    impromptuSpeechInput.EndTime = new Date().getTime();
  };

  const onQuestionEdit = async () => {
    const newMessage = await showPrompt(
      Locale.Chat.Actions.Edit,
      questionItem.Question,
    );
    chatStore.updateCurrentSession((session) => {
      questionItem.Question = newMessage;
    });
  };

  const onSampleSpeechEdit = async () => {
    const newMessage = await showPrompt(
      Locale.Chat.Actions.Edit,
      questionItem.SampleSpeech,
    );
    chatStore.updateCurrentSession((session) => {
      questionItem.SampleSpeech = newMessage;
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.navigation}>
        <button className={styles.navButton} onClick={onReturn}>
          {" "}
          ← Return
        </button>
        <ButtonGroup
          variant="outlined"
          aria-label="radius button group"
          sx={{
            "--ButtonGroup-radius": "40px",
            border: "1px solid #ccc", // 添加这行来直接设置边框
            "& button": {
              // 添加这个样式来改变按钮内的文本样式
              textTransform: "none",
            },
          }}
        >
          <Button onClick={onPreviousQuestion}>{"<"}</Button>
          <Button>{`Question ${currentNum + 1} / ${questionNums}`}</Button>
          <Button onClick={onNextQuestion}>{">"}</Button>
        </ButtonGroup>

        <button className={styles.capsuleButton} onClick={onReport}>
          End & Report
        </button>
      </div>

      <BorderLine></BorderLine>

      <p className={styles.questionText} onClick={onQuestionEdit}>
        {questionItem.Question}
      </p>
      <div className={styles.timer}>
        {/* TODO: 为啥 questionItem.SpeechTime 也会刷新? */}
        <span>{formatTime(speechTime)} / 2:00</span>
      </div>

      <form onSubmit={(event) => event.preventDefault()}>
        {recordingStatus === StageStatus.Start && (
          <Stack
            direction="row"
            spacing={5}
            justifyContent="center"
            alignItems="center"
          >
            <IconButtonMui
              title="Play"
              onClick={() =>
                speechSynthesizer.startSynthesize(
                  questionItem.Question,
                  session.mask.lang,
                )
              }
            >
              <PlayCircleIcon />
            </IconButtonMui>
            <IconButtonMui
              title="Record"
              color="primary"
              sx={{
                color: "green",
                fontSize: "40px",
              }}
              onClick={onRecord}
            >
              <MicIcon sx={{ fontSize: "inherit" }} />
            </IconButtonMui>
          </Stack>
        )}

        {recordingStatus === StageStatus.Recording && (
          <Stack
            direction="row"
            spacing={5}
            justifyContent="center"
            alignItems="center"
          >
            <IconButtonMui
              title="Recording"
              color="primary"
              sx={{
                color: "red",
                fontSize: "40px",
              }}
              onClick={onPause}
            >
              <MicIcon sx={{ fontSize: "inherit" }} />
            </IconButtonMui>
          </Stack>
        )}

        {recordingStatus === StageStatus.Paused && (
          <Stack
            direction="row"
            spacing={5}
            justifyContent="center"
            alignItems="center"
          >
            <IconButtonMui
              title="Reset"
              color="primary"
              sx={{
                color: "red",
              }}
              onClick={onReset}
            >
              <ResetIcon />
            </IconButtonMui>

            <IconButtonMui
              title="Resume"
              aria-label="record"
              color="primary"
              sx={{
                color: "green",
                fontSize: "40px",
              }}
              onClick={onRecord}
            >
              <MicOffIcon sx={{ fontSize: "inherit" }} />
            </IconButtonMui>

            <IconButtonMui
              title="Score"
              aria-label="record"
              color="primary"
              sx={{
                color: "green",
                fontSize: "40px",
              }}
              onClick={onScore}
            >
              <VerifiedIcon sx={{ fontSize: "inherit" }} />
            </IconButtonMui>
          </Stack>
        )}

        {recordingStatus === StageStatus.Stopped && (
          <Stack
            direction="row"
            spacing={5}
            justifyContent="center"
            alignItems="center"
          >
            <IconButtonMui
              title="Reset"
              color="primary"
              sx={{
                color: "red",
              }}
              onClick={onReset}
            >
              <ResetIcon />
            </IconButtonMui>

            <IconButtonMui
              title="Continue Recording"
              aria-label="record"
              color="primary"
              sx={{
                color: "green",
                fontSize: "40px",
              }}
              onClick={onRecord}
            >
              <MicOffIcon sx={{ fontSize: "inherit" }} />
            </IconButtonMui>

            <IconButtonMui
              title="Play Speech"
              color="secondary"
              aria-label="score"
              sx={{
                backgroundColor: "lightblue", // 淡蓝色背景
                color: "white", // 图标颜色，这里选择了白色
                "&:hover": {
                  backgroundColor: "blue", // 鼠标悬停时的背景色，这里选择了蓝色
                },
                borderRadius: "50%", // 圆形
                width: 40, // 宽度
                height: 40, // 高度
                padding: 0, // 如果需要，调整内边距
              }}
              onClick={onPlay}
            >
              <Typography variant="subtitle1">{questionItem.Score}</Typography>
            </IconButtonMui>
          </Stack>
        )}
      </form>

      <BorderLine></BorderLine>

      <Accordion sx={{ backgroundColor: "#f5f5f5", userSelect: "text" }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Sample Speech</Typography>
        </AccordionSummary>
        <AccordionDetails style={{ textAlign: "left" }}>
          <Markdown
            content={questionItem.SampleSpeech}
            fontSize={config.fontSize}
            parentRef={scrollRef}
            onClick={onSampleSpeechEdit}
          />
          <Stack
            direction="row"
            spacing={5}
            justifyContent="center"
            alignItems="center"
          >
            <IconButtonMui
              title="play"
              onClick={() =>
                speechSynthesizer.startSynthesize(
                  questionItem.SampleSpeech,
                  session.mask.lang,
                )
              }
            >
              <PlayCircleIcon />
            </IconButtonMui>
            <IconButtonMui
              title="Regenerage"
              onClick={onRegenerateSampleSpeech}
            >
              <ReplayCircleFilledIcon />
            </IconButtonMui>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion
        sx={{
          backgroundColor: "#f5f5f5",
          userSelect: "text",
          marginTop: "5px",
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Evaluations</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ width: "100%", typography: "body1" }}>
            <TabContext value={evaluationRole}>
              <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <TabList
                  onChange={handleChangeEvaluationRole}
                  aria-label="lab API tabs example"
                >
                  <Tab
                    label={"Scores"}
                    value={"Scores"}
                    sx={{ textTransform: "none" }}
                  />
                  {evaluationRoles.map((role, index) => (
                    <Tab
                      key={index}
                      label={role}
                      value={role}
                      sx={{ textTransform: "none" }}
                    />
                  ))}
                </TabList>
              </Box>
              <TabPanel value="Scores">
                {questionItem.Scores.length > 0 && (
                  <RadarChart
                    cx={250}
                    cy={150}
                    outerRadius={100}
                    width={500}
                    height={300}
                    data={questionItem.Scores}
                  >
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar
                      name="Mike"
                      dataKey="score"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    >
                      <LabelList dataKey="score" position="inside" angle={0} />
                    </Radar>
                    <text
                      x={250}
                      y={150}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="green"
                      style={{ fontSize: 50 }} // 设置字体大小为 30
                    >
                      {questionItem.Score}
                    </text>
                  </RadarChart>
                )}
                {/* <Typography style={{ textAlign: "left" }}>
                  {ImpromptuSpeechPrompts.GetScoreRolesDescription().map(
                    (description, index) => (
                      <ReactMarkdown  key={index}>
                        {description}
                      </ReactMarkdown>
                    )
                  )}
                </Typography> */}
              </TabPanel>
              {evaluationRoles.map((role, index) => (
                <TabPanel key={index} value={role}>
                  {role in questionItem.Evaluations ? (
                    <Typography style={{ textAlign: "left" }}>
                      <ReactMarkdown>
                        {questionItem.Evaluations[role]}
                      </ReactMarkdown>
                      <Stack
                        direction="row"
                        spacing={5}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <IconButtonMui
                          aria-label="play"
                          onClick={() =>
                            speechSynthesizer.startSynthesize(
                              questionItem.Evaluations[role],
                              session.mask.lang,
                            )
                          }
                        >
                          <PlayCircleIcon />
                        </IconButtonMui>
                        <IconButtonMui
                          title="Regenerage"
                          onClick={(event) => onRegenerateEvaluation(role)}
                        >
                          <ReplayCircleFilledIcon />
                        </IconButtonMui>
                      </Stack>
                    </Typography>
                  ) : evaluating ? (
                    <CircularProgress />
                  ) : (
                    <Button
                      onClick={(event) => onEvaluation(event)}
                      variant="outlined"
                      sx={{
                        textTransform: "none", // 防止文本大写
                        borderColor: "primary.main", // 设置边框颜色，如果需要
                      }}
                    >
                      Look
                    </Button>
                  )}
                </TabPanel>
              ))}
            </TabContext>
          </Box>
        </AccordionDetails>
      </Accordion>
    </div>
  );
};

function RehearsalReportCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

export function FreePersonalReport(props: {
  impromptuSpeechInput: ImpromptuSpeechInput;
}) {
  const questionItems = props.impromptuSpeechInput.QuestionItems;

  const chatStore = useChatStore();
  const [session, sessionIndex] = useChatStore((state) => [
    state.currentSession(),
    state.currentSessionIndex,
  ]);

  class IQuestionItemBarData {
    TickName: string = "";
    SpeechTime: number = 0;
    Score: number = 0;
    Pace: number = 0;
    Scores: { subject: string; score: number }[] = [];
  }
  const [barDatas, setBarDatas] = useState<IQuestionItemBarData[]>([]);
  const [averageData, setAverageData] = useState<IQuestionItemBarData>(
    new IQuestionItemBarData(),
  );

  useEffect(() => {
    if (props.impromptuSpeechInput.TotalEvaluations === "") {
      onRegenerateTotalEvaluation();
    }

    const newBarDatas = getQuestionItemsBarData();
    setBarDatas(newBarDatas);
    calculateAndSetAverage(newBarDatas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculateAndSetAverage = (data: IQuestionItemBarData[]) => {
    let newAverage = new IQuestionItemBarData();
    newAverage.Score = Math.round(
      data.reduce((acc, current) => acc + current.Score, 0) / data.length,
    );
    newAverage.SpeechTime = Math.round(
      data.reduce((acc, current) => acc + current.SpeechTime, 0) / data.length,
    );
    newAverage.Pace = Math.round(
      data.reduce((acc, current) => acc + current.Pace, 0) / data.length,
    );

    const scoreRoles = ImpromptuSpeechPrompts.GetScoreRoles();
    newAverage.Scores = [];
    for (let i = 0; i < scoreRoles.length; i++) {
      newAverage.Scores.push({ subject: scoreRoles[i], score: 0 });
    }

    for (let i = 0; i < questionItems.length; i++) {
      const questionItem = questionItems[i];

      for (let j = 0; j < questionItem.Scores.length; j++) {
        newAverage.Scores[j].score += questionItem.Scores[j].score;
      }
    }

    for (let j = 0; j < newAverage.Scores.length; j++) {
      newAverage.Scores[j].score = Math.round(
        newAverage.Scores[j].score / questionItems.length,
      );
    }

    setAverageData(newAverage);
  };

  const onRegenerateTotalEvaluation = () => {
    chatStore.resetSessionFromIndex(2);
    chatStore.updateCurrentSession(
      (session) => (props.impromptuSpeechInput.TotalEvaluations = ""),
    );
    const ask = ImpromptuSpeechPrompts.GetTotalEvaluationPrompt(questionItems);
    chatStore.onUserInput(ask);
    chatStore.getIsFinished().then(() => {
      const response = session.messages[session.messages.length - 1].content;
      chatStore.updateCurrentSession(
        (session) => (props.impromptuSpeechInput.TotalEvaluations = response),
      );
      chatStore.resetSessionFromIndex(2);
    });
  };

  const onReturn = () => {
    chatStore.updateCurrentSession(
      (session) =>
        (props.impromptuSpeechInput.ActivePage = ImpromptuSpeechStage.Question),
    );
  };

  const getTotalTime = (): number => {
    const difference =
      props.impromptuSpeechInput.EndTime - props.impromptuSpeechInput.StartTime; // 毫秒差
    return Math.round(difference / 1000); // 秒差
  };

  const getQuestionAnswered = (): number => {
    let _count = 0;
    for (const item of questionItems) {
      if (item.Speech !== "") {
        _count += 1;
      }
    }
    return _count;
  };

  const getQuestionItemsBarData = (): IQuestionItemBarData[] => {
    let barData: IQuestionItemBarData[] = [];

    for (let i = 0; i < questionItems.length; i++) {
      const questionItem = questionItems[i];
      let _barItem = new IQuestionItemBarData();
      _barItem.SpeechTime = questionItem.SpeechTime;
      _barItem.Score = questionItem.Score;
      _barItem.TickName = `Question${i + 1}`;
      if (questionItem.SpeechTime !== 0) {
        _barItem.Pace = Math.round(
          (ChatUtility.getWordsNumber(questionItem.Speech) /
            questionItem.SpeechTime) *
            60,
        );
      }
      barData.push(_barItem);
    }
    return barData;
  };

  const RadarOuterRadius = 150;
  const RadarWidth = RadarOuterRadius * 3;
  const RadarHeight = RadarOuterRadius * 2.4;

  return (
    <Box sx={{ padding: 3, maxWidth: "100%", margin: "auto" }}>
      <Typography variant="h5" gutterBottom>
        Impromptu Speech Report
      </Typography>

      {/* Summary Card */}
      <RehearsalReportCard title="Summary">
        <Typography
          variant="h5"
          component="div"
          display="flex"
          justifyContent={"center"}
        >
          Congratulation! Great Job!
        </Typography>
        <CardContent
          sx={{
            display: "flex",
            justifyContent: "space-between",
            flexDirection: "row",
            height: RadarHeight * 0.9,
          }}
        >
          <RadarChart
            cx={RadarWidth / 2}
            cy={RadarHeight / 2}
            outerRadius={RadarOuterRadius}
            width={RadarWidth}
            height={RadarHeight}
            data={averageData.Scores}
          >
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis domain={[0, 100]} />
            <Radar
              dataKey="score"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.6}
            >
              <LabelList dataKey="score" position="inside" angle={0} />
            </Radar>
            <text
              x={RadarWidth / 2}
              y={RadarHeight / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="green"
              style={{ fontSize: 50 }} // 设置字体大小为 30
            >
              {averageData.Score}
            </text>
            <text
              x={RadarWidth / 2}
              y={RadarHeight - 30}
              fill="black"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="20px"
            >
              {"Average Score"}
            </text>
          </RadarChart>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                mt: 2,
              }}
            >
              <Typography variant="h4" color="text.primary">
                {ChatUtility.formatTime(getTotalTime())}
              </Typography>
              <Typography fontSize="20px" color="text.secondary">
                Total Time
              </Typography>
            </Box>
            <GaugeChart
              data={[
                { name: "0", value: 60, color: "gray" },
                { name: "60", value: 30, color: "green" },
                { name: "90", value: 30, color: "yellow" },
                { name: "120", value: 30, color: "red" },
                { name: "150", value: 0, color: "red" },
              ]}
              outerRadius={100}
              value={averageData.SpeechTime}
              unit="seconds"
              title="Average Time"
            ></GaugeChart>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                mt: 2,
              }}
            >
              <Typography variant="h4" color="text.primary">
                {getQuestionAnswered()} /{" "}
                {props.impromptuSpeechInput.QuestionNums}
              </Typography>
              <Typography fontSize="20px" color="text.secondary">
                Questions
              </Typography>
            </Box>
            <GaugeChart
              data={[
                { name: "slow", value: 100, color: "gray" },
                { name: "100", value: 50, color: "green" },
                { name: "150", value: 50, color: "yellow" },
                { name: "fast", value: 0, color: "red" },
              ]}
              outerRadius={100}
              value={averageData.Pace}
              unit="words/min"
              title="Average Pace"
            ></GaugeChart>
          </Box>
        </CardContent>
      </RehearsalReportCard>

      {/* Bar Card */}
      <RehearsalReportCard title="Distribution">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            width={500}
            height={300}
            data={getQuestionItemsBarData()}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="TickName" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="SpeechTime" fill="#8884d8" name="SpeechTime(s)">
              <LabelList dataKey="SpeechTime" position="top" />
            </Bar>
            <Bar dataKey="Score" fill="#82ca9d" name="Score">
              <LabelList dataKey="Score" position="top" />
            </Bar>
            <Bar dataKey="Pace" fill="#FFCC99" name="Pace(words/min)">
              <LabelList dataKey="Pace" position="top" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </RehearsalReportCard>

      {/* Evaluation Card */}
      <RehearsalReportCard title="Evaluation">
        {props.impromptuSpeechInput.TotalEvaluations !== "" ? (
          <Typography style={{ textAlign: "left" }}>
            <ReactMarkdown>
              {props.impromptuSpeechInput.TotalEvaluations}
            </ReactMarkdown>
            <Stack
              direction="row"
              spacing={5}
              justifyContent="center"
              alignItems="center"
            >
              <IconButtonMui
                aria-label="play"
                onClick={() =>
                  speechSynthesizer.startSynthesize(
                    props.impromptuSpeechInput.TotalEvaluations,
                    session.mask.lang,
                  )
                }
              >
                <PlayCircleIcon />
              </IconButtonMui>
              <IconButtonMui
                title="Regenerage"
                onClick={onRegenerateTotalEvaluation}
              >
                <ReplayCircleFilledIcon />
              </IconButtonMui>
            </Stack>
          </Typography>
        ) : (
          <Typography style={{ textAlign: "center" }}>
            <CircularProgress />
          </Typography>
        )}
      </RehearsalReportCard>

      <Button
        variant="outlined"
        sx={{ mt: 3, textTransform: "none" }}
        onClick={onReturn}
      >
        Rehearse Again
      </Button>
    </Box>
  );
}
