// Python API client for communicating with the Python sidecar backend

const port = 8004;
const base_url = `http://localhost:${port}`;

class PythonApi {
  /**
   * Check if the Python API is ready and responsive
   */
  async ready() {
    try {
      const response = await fetch(`${base_url}/health`, {
        signal: AbortSignal.timeout(2000)
      });
      return response.ok;
    } catch (error) {
      console.error("Error checking Python API health:", error);
      return false;
    }
  }

  /**
   * Shut down the Python API server
   */
  async shutdown() {
    try {
      await fetch(`${base_url}/shutdown`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000)
      });
      console.log("Python API shutdown initiated");
    } catch (error) {
      console.error("Error shutting down Python API:", error);
      // We don't throw here since the app is shutting down anyway
    }
  }
}

const pythonApi = new PythonApi();

export default pythonApi; 