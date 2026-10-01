import axios from "axios";

export default class NounService {
    static async getQuestion(id) {
        const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:4001";
        const ruta = `${baseUrl}/api/noun/${id}`;

        try {
            const response = await axios.get(ruta);
            return response.data; // Return the data directly
        } catch (error) {
            throw new Error(
                error.response?.data?.message || "An error occurred while fetching the noun."
            );
        }
    }
}