import React from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { autoLogout } from "../store/actions/auth";
import PageShell from "../components/ui/PageShell";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import LogoutButton from "../components/ui/LogoutButton";

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const userLogout = async () => {
    await dispatch(autoLogout());
    navigate("/login");
  };

  return (
    <PageShell>
      <LogoutButton onClick={userLogout} />
      <Card>
        <h1 className="ui-heading ui-heading--large">Welcome</h1>
        <Button onClick={() => navigate("/create")}>
          Create a Game
        </Button>
        <Button onClick={() => navigate("/join")}>
          Join a Game
        </Button>
        <Button variant="secondary" onClick={() => navigate("/oldstories")}>
          My Stories
        </Button>
      </Card>
    </PageShell>
  );
};

export default Home;
