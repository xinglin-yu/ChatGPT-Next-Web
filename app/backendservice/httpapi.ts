import axios, { AxiosResponse, AxiosError, Method } from "axios";

async function sendRequest<T>(
  url: string,
  method: Method,
  data?: any,
): Promise<T> {
  try {
    const response: AxiosResponse<T> = await axios({
      method,
      url,
      data,
    });

    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Request failed with status:", error.response.status);
    } else if (error.request) {
      console.error("No response received");
    } else {
      console.error("Error:", error.message);
    }

    throw error;
  }
}

export default sendRequest;
