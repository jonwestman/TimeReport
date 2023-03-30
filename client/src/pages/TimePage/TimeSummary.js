import { useEffect, useReducer, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Table from "react-bootstrap/Table";
import EditProject from "./EditProject";
import CheckProjectStatus from "../../components/RadioButtons";
import { useAuthHeader } from "react-auth-kit";

import timesumsCss from "./TimeSummary.css";
import { useTreasure } from "react-treasure";

export default function TimeSummary(props) {
  const authHeader = useAuthHeader();
  const [editProject, setEditProject] = useState([]);
  const [showEditProject, setShowEditProject] = useState(false);
  const [SelectedRadioBtn, setSelectedRadioBtn] = useState("Active");
  const [projects, setProjects] = useState([]);
  const [peopleData, setPeopleData] = useState(null);
  const [timeData, setTimeData] = useState(null);
  const [projectRefetch, toggleProjectRefetch] = useReducer((previousValue) => {
    return !previousValue;
  }, false);
  const [peopleRefetch, togglePeopleRefetch] = useReducer((previousValue) => {
    return !previousValue;
  }, false);
  const [timereportRefetch, toggleTimereportRefetch] = useReducer(
    (previousValue) => {
      return !previousValue;
    },
    false
  );
  const [storedProjectRefetch, toggleStoredProjectRefetch] = useTreasure(
    "project-refetch",
    toggleProjectRefetch
  );
  const [storedPeopleRefetch, toggleStoredPeopleRefetch] = useTreasure(
    "people-refetch",
    togglePeopleRefetch
  );
  const [storedTimeReportRefetch, toggleStoredTimeReportRefetch] = useTreasure(
    "timereport-refetch",
    toggleTimereportRefetch
  );

  function toggleShowEditProject() {
    setShowEditProject(!showEditProject);
  }

  useEffect(() => {
    console.log(authHeader());
    fetch("/api/projects", {
      cache: "reload",
      headers: {
        Authorization: authHeader(),
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("data:");
        console.log(data.results);
        setProjects(data.results);
      });
  }, [projectRefetch]);

  useEffect(() => {
    fetch("/api/people", {
      cache: "reload",
      headers: {
        Authorization: authHeader(),
      },
    })
      .then((res) => res.json())
      .then((data) => setPeopleData(data));
  }, [peopleRefetch]);

  useEffect(() => {
    fetch("/api/timereports?collated=true", {
      cache: "reload",
      headers: {
        Authorization: authHeader(),
      },
    })
      .then((res) => res.json())
      .then((data) => setTimeData(data));
  }, [timereportRefetch]);

  function projectEdit(ProjectId, Status, Hours) {
    fetch("/api/pages/" + ProjectId, {
      method: "PATCH",
      headers: {
        "Content-type": "application/json",
        Authorization: authHeader(),
      },
      body: JSON.stringify({
        properties: {
          Status: {
            select: {
              name: Status,
            },
          },
          Hours: {
            number: parseInt(Hours),
          },
        },
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Something went wrong");
        }
        return response.json();
      })
      .then((data) => {
        toggleShowEditProject();
        //setEditProject([...editProject, data.results]); // Does it do anything?
        toggleProjectRefetch();
      })
      .catch((e) => {
        console.log(e);
      });
  }

  let timeProject = "";

  return (
    <div className="Table_container m-2">
      <div className="flex justify-content: flex-end">
        <div className="mx-10 my-2">
          <CheckProjectStatus setSelectedRadioBtn={setSelectedRadioBtn} />
        </div>
        <div className="mx-10">
          <EditProject
            projectEdit={projectEdit}
            showEditProject={showEditProject}
            toggleShowEditProject={toggleShowEditProject}
            projects={projects}
          />
        </div>
      </div>
      {/* Here is display for projects DB */}
      <div className="Project_container">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Status</th>
              <th>Hours</th>
              <th>Estimated hours left</th>
              <th>Worked Hours</th>
              <th>Start-Date</th>
              <th>End-Date</th>
            </tr>
          </thead>
          {projects
            ? projects
                .filter((status) =>
                  status.properties.Status.select.name.includes(
                    SelectedRadioBtn
                  )
                )
                .map((project) => (
                  <tbody>
                    <tr>
                      <td
                        className="project_status"
                        id={project.properties.Status.select.name}
                        style={{
                          backgroundColor:
                            project.properties.Status.select.name === "Active"
                              ? "yellow"
                              : "",
                        }}
                      >
                        {project.properties.Projectname.title[0].text.content}
                        {props.children}
                      </td>
                      <td>{project.properties.Status.select.name}</td>
                      <td>{project.properties.Hours.number}</td>
                      <td
                        style={{
                          backgroundColor:
                            project.properties.HoursLeft.formula.number < 0
                              ? "lightpink"
                              : "",
                        }}
                        value={
                          project.properties.HoursLeft.formula.number < 0
                            ? (timeProject = "WARNING")
                            : (timeProject = "")
                        }
                      >
                        {project.properties.HoursLeft.formula.number}{" "}
                        {timeProject}
                      </td>
                      <td>{project.properties.WorkedHours.rollup.number}</td>
                      <td>{project.properties.Timespan.date.start}</td>
                      <td>{project.properties.Timespan.date.end}</td>
                    </tr>
                  </tbody>
                ))
            : null}
        </Table>
      </div>
      {/* Here is the display for People DB */}
      <div className="People_container">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Names</th>
              <th>Total hours worked </th>
              <th>Role</th>
            </tr>
          </thead>
          {peopleData
            ? peopleData.results.map((people) => (
                <tbody>
                  <tr>
                    <td>{people.properties.Name.title[0].text.content}</td>
                    <td>{people.properties.TotalHours.rollup.number}</td>
                    <td>{people.properties.Role.select.name}</td>
                  </tr>
                </tbody>
              ))
            : null}
        </Table>
      </div>
      {/* Here is the display for TimeProject DB */}
      <div className="TimeReport_container">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Date</th>
              <th>Person</th>
              <th>Hours</th>
              <th>Project</th>
              <th>Note</th>
            </tr>
          </thead>
          {timeData
            ? timeData.results.map((time) => (
                <tbody>
                  <tr>
                    <td>{time.properties.Date.date.start}</td>
                    <td>
                      {
                        time.properties.Person.relation_properties.Name.title[0]
                          .text.content
                      }
                    </td>
                    <td>{time.properties.Hours.number}</td>
                    <td>
                      {
                        time.properties.Project.relation_properties.Projectname
                          .title[0].text.content
                      }
                    </td>
                    <td>{time.properties.Note.title[0].text.content}</td>
                  </tr>
                </tbody>
              ))
            : null}
        </Table>
      </div>
    </div>
  );
}
