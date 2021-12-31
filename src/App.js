import { useLayoutEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import AutoSizer from "react-virtualized-auto-sizer";
import CanvasChart from "./CanvasChart";
import CodeEditor from "./CodeEditor";
import Header from "./Header";
import { parseCode, stringifyObject } from "./utils/parsing";
import { owners as initialOwners, tasks as initialTasks } from "./tasks";
import useURLData from "./hooks/useURLData";
import styles from "./App.module.css";

const defaultData = { tasks: initialTasks, owners: initialOwners };

export default function App() {
  const [preloadCounter, setPreloadCounter] = useState(false);

  const [data, setData] = useURLData(defaultData);

  const { owners, tasks } = data;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ownerToImageMap = useMemo(() => new Map(), [owners]);

  const ownersString = useMemo(
    () => stringifyObject(data.owners),
    [data.owners]
  );
  const tasksString = useMemo(() => stringifyObject(data.tasks), [data.tasks]);

  const handleOwnersChange = (newString) => {
    try {
      const newOwners = parseCode(newString);
      if (newOwners != null) {
        setData({ ...data, owners: newOwners });
      }
    } catch (error) {
      // Parsing errors are fine; they're expected while typing.
    }
  };

  const handleTasksChange = (newString) => {
    try {
      const newTasks = parseCode(newString);
      if (newTasks != null && Array.isArray(newTasks)) {
        setData({ ...data, tasks: newTasks });
      }
    } catch (error) {
      // Parsing errors are fine; they're expected while typing.
    }
  };

  // Pre-load images so we can draw avatars to the Canvas.
  useLayoutEffect(() => {
    preloadImages(owners, ownerToImageMap, () => {
      // Now that all images have been pre-loaded, re-render and draw them to the Canvas.
      // Incrementing this counter just lets React know we want to re-render.
      // The specific count value has no significance.
      setPreloadCounter((value) => value + 1);
    });
  }, [owners, ownerToImageMap]);

  const resetError = () => {
    setData(defaultData);
  };

  return (
    <div className={styles.App}>
      <Header owners={owners} tasks={tasks} />

      <div className={styles.ChartContainer}>
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={resetError}>
          <AutoSizer disableHeight>
            {({ width }) => (
              <CanvasChart
                owners={owners}
                ownerToImageMap={ownerToImageMap}
                preloadCounter={preloadCounter}
                tasks={tasks}
                width={width}
              />
            )}
          </AutoSizer>
        </ErrorBoundary>
      </div>

      <div className={styles.CodeContainer}>
        <div className={styles.CodeColumnLeft}>
          <div className={styles.CodeHeader}>Tasks</div>
          <CodeEditor code={tasksString} onChange={handleTasksChange} />
        </div>
        <div className={styles.CodeColumnRight}>
          <div className={styles.CodeHeader}>Team</div>
          <CodeEditor code={ownersString} onChange={handleOwnersChange} />
        </div>
      </div>
    </div>
  );
}

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <>
      <div className={styles.ErrorHeader}>Something went wrong:</div>
      <pre className={styles.ErrorMessage}>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </>
  );
}

async function preloadImages(owners, ownerToImageMap, callback) {
  const promises = [];

  for (let key in owners) {
    const owner = owners[key];

    if (owner?.avatar != null && typeof owner?.avatar === "string") {
      promises.push(
        new Promise((resolve) => {
          const image = new Image();
          image.onload = () => {
            ownerToImageMap.set(owner, {
              height: image.naturalHeight,
              image,
              width: image.naturalWidth,
            });

            resolve();
          };
          image.src = owner.avatar;
        })
      );
    }
  }

  await Promise.all(promises);

  callback();
}
