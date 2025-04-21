// Python API client for communicating with the Python backend

const port = 8004;
const base_url = `http://127.0.0.1:${port}`;

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
   * The pywebview app will handle this automatically when closing
   */
  async shutdown() {
    try {
      console.log("Shutting down Python API...");
      await fetch(`${base_url}/shutdown`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000)
      });
      console.log("Python API shutdown initiated");
      return true;
    } catch (error) {
      console.error("Error shutting down Python API:", error);
      return false;
    }
  }
}

const pythonApi = new PythonApi();

export default pythonApi; 