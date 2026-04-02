import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";
import LogoRouteListener from "./components/LogoRouteListener";
import { ToastProvider } from "./components/ui/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import {
  CreatedGame,
  CreateGame,
  GameCreator,
  GameResult,
  Home,
  JoinGame,
  Login,
  OldStories,
  PlayGame,
  Signup,
  StartGame,
  StoryView,
  PublicResult,
  Welcome,
  InviteRedirect,
  HostGame,
  PartnerView,
} from "./Pages";
import userReducer from "./store/reducers/auth";
import storyReducer from "./store/reducers/story";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import ReduxThunk from "redux-thunk";

const rootReducer = combineReducers({
  auth: userReducer,
  storyData: storyReducer,
});

const store = createStore(rootReducer, applyMiddleware(ReduxThunk));

const App = () => {
  return (
    <Provider store={store}>
      <ToastProvider>
        <ErrorBoundary>
          <Router>
            <LogoRouteListener />
            <Routes>
              <Route path="/live/host/:inviteCode" element={<HostGame />} />
              <Route path="/live/play/:inviteCode" element={<PartnerView />} />
              <Route path="/result" element={<GameResult />} />
              <Route path="/result/:resultId" element={<PublicResult />} />
              <Route path="/play" element={<PlayGame />} />
              <Route path="/start/:id" element={<StartGame />} />
              <Route path="/story/:resultId" element={<StoryView />} />
              <Route path="/join" element={<JoinGame />} />
              <Route path="/created-game/:id" element={<CreatedGame />} />
              <Route path="/s/:shortCode" element={<InviteRedirect />} />
              <Route path="/game-creator/:id" element={<GameCreator />} />
              <Route path="/create" element={<CreateGame />} />
              <Route path="/oldstories" element={<OldStories />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route exact path="/home" element={<PrivateRoute />}>
                <Route exact path="/home" element={<Home />} />
              </Route>
              <Route path="/" element={<Welcome />} />
            </Routes>
          </Router>
        </ErrorBoundary>
      </ToastProvider>
    </Provider>
  );
};

export default App;
