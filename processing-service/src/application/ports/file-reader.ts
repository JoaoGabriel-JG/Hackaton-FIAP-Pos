export type FileContent = {
  buffer: Buffer;
  mimeType: string;
};

export type FileReader = {
  read(filePath: string): Promise<FileContent>;
};
