class Notification {
  public Error(message: string): void {
    console.log('Error: ' + message);
  }

  public Debug(message: string): void {
    console.log('Debug: ' + message);
  }
}

const instance = new Notification();

export default instance;
