import sendRequest from "./httpapi";

interface WeatherForecast {
  date: string;
  temperatureC: number;
  temperatureF: number;
  summary: string;
}

// 示例调用
export async function getWeather() {
  try {
    const users = await sendRequest<WeatherForecast[]>(
      "https://zcareers-zbotservice.azurewebsites.net/WeatherForecast/GetWeatherForecast",
      "GET",
    );
    console.log(users);
  } catch (error) {
    // 处理错误
  }
}

// export default getWeather;
getWeather();
