import { useRecoilState } from "recoil"
import { useSnackbar } from "notistack"
import {
  getStudyDetailAPI,
  getStudySummariesAPI,
  createNewStudyAPI,
  deleteStudyAPI,
  saveNoteAPI,
} from "./apiClient"
import {
  graphVisibilityState,
  studyDetailsState,
  studySummariesState,
} from "./state"

const localStorageGraphVisibility = "graphVisibility"

export const actionCreator = () => {
  const { enqueueSnackbar } = useSnackbar()
  const [studySummaries, setStudySummaries] =
    useRecoilState<StudySummary[]>(studySummariesState)
  const [studyDetails, setStudyDetails] =
    useRecoilState<StudyDetails>(studyDetailsState)
  const [graphVisibility, setGraphVisibility] =
    useRecoilState<GraphVisibility>(graphVisibilityState)

  const setStudyDetailState = (studyId: number, study: StudyDetail) => {
    const newVal = Object.assign({}, studyDetails)
    newVal[studyId] = study
    setStudyDetails(newVal)
  }

  const updateStudySummaries = (successMsg?: string) => {
    getStudySummariesAPI()
      .then((studySummaries: StudySummary[]) => {
        setStudySummaries(studySummaries)

        if (successMsg) {
          enqueueSnackbar(successMsg, { variant: "success" })
        }
      })
      .catch((err) => {
        enqueueSnackbar(`Failed to fetch study list.`, {
          variant: "error",
        })
        console.log(err)
      })
  }

  const updateStudyDetail = (studyId: number) => {
    let nLocalFixedTrials = 0
    if (studyId in studyDetails) {
      const currentTrials = studyDetails[studyId].trials
      const firstUpdatable = currentTrials.findIndex((trial) =>
        ["Running", "Waiting"].includes(trial.state)
      )
      nLocalFixedTrials =
        firstUpdatable === -1 ? currentTrials.length : firstUpdatable
    }
    getStudyDetailAPI(studyId, nLocalFixedTrials)
      .then((study) => {
        const currentFixedTrials =
          studyId in studyDetails
            ? studyDetails[studyId].trials.slice(0, nLocalFixedTrials)
            : []
        study.trials = currentFixedTrials.concat(study.trials)
        setStudyDetailState(studyId, study)
      })
      .catch((err) => {
        const reason = err.response?.data.reason
        if (reason !== undefined) {
          enqueueSnackbar(`Failed to fetch study (reason=${reason})`, {
            variant: "error",
          })
        }
        console.log(err)
      })
  }

  const createNewStudy = (studyName: string, directions: StudyDirection[]) => {
    createNewStudyAPI(studyName, directions)
      .then((study_summary) => {
        const newVal = [...studySummaries, study_summary]
        setStudySummaries(newVal)
        enqueueSnackbar(`Success to create a study (study_name=${studyName})`, {
          variant: "success",
        })
      })
      .catch((err) => {
        enqueueSnackbar(`Failed to create a study (study_name=${studyName})`, {
          variant: "error",
        })
        console.log(err)
      })
  }

  const deleteStudy = (studyId: number) => {
    deleteStudyAPI(studyId)
      .then((study) => {
        setStudySummaries(studySummaries.filter((s) => s.study_id !== studyId))
        enqueueSnackbar(`Success to delete a study (id=${studyId})`, {
          variant: "success",
        })
      })
      .catch((err) => {
        enqueueSnackbar(`Failed to delete study (id=${studyId})`, {
          variant: "error",
        })
        console.log(err)
      })
  }

  const getGraphVisibility = () => {
    const localStoragePreferences = localStorage.getItem(
      localStorageGraphVisibility
    )
    if (localStoragePreferences !== null) {
      const merged = {
        ...graphVisibility,
        ...JSON.parse(localStoragePreferences),
      }
      setGraphVisibility(merged)
    }
  }

  const saveGraphVisibility = (value: GraphVisibility) => {
    setGraphVisibility(value)
    localStorage.setItem(localStorageGraphVisibility, JSON.stringify(value))
  }

  const saveNote = (studyId: number, note: Note): Promise<void> => {
    return saveNoteAPI(studyId, note)
      .then(() => {
        const newStudy = Object.assign({}, studyDetails[studyId])
        newStudy.note = note
        setStudyDetailState(studyId, newStudy)
        enqueueSnackbar(`Success to save the note`, {
          variant: "success",
        })
      })
      .catch((err) => {
        if (err.response.status === 409) {
          const newStudy = Object.assign({}, studyDetails[studyId])
          newStudy.note = err.response.data.note
          setStudyDetailState(studyId, newStudy)
        }
        const reason = err.response?.data.reason
        if (reason !== undefined) {
          enqueueSnackbar(`Failed: ${reason}`, {
            variant: "error",
          })
        }
        throw err
      })
  }

  return {
    updateStudyDetail,
    updateStudySummaries,
    createNewStudy,
    deleteStudy,
    getGraphVisibility,
    saveGraphVisibility,
    saveNote,
  }
}

export type Action = ReturnType<typeof actionCreator>
