# NPTEL Video Miner
-------------------

This application is designed to download videos from NPTEL course website [http://nptel.ac.in/]

## Dependencies

- NodeJS

## Configurations
    
    ```json
    {                 
        "max_parallel_downloads": 2,
        "download_path": "./downloads",
        "downloads": [
          "Artificial Intelligence"
        ]
    }
    ```

The application has three configurations - 

- **max_parallel_downloads** : The number of parallel downloads, defaults to 1 if not mentioned
- **download_path** : This tells the application where to download the course videos and where the config files are located for the course download.
The video files will be downloaded under a directory named video, inside this directory.
- **downloads**: This is an array containing the **exact** name of the directory inside the *download_path*, which you want to download.
  There may be many directories (courses) in the *download_path*, however, only those will be downloaded that you define in this parameter.

## Setup new course for download

Follow these steps to download course videos

- Create a directory under *download_path*
- Create a **config.json** in the course directory
- Mention the course directory name in the *downloads* array of the project's config.json (as defined above) 

The config.json file should have the following parameters - 

    ```json
    {
        "name": "Artificial Intelligence",
        "links": {
          "download_link": "http://npteldownloads.iitm.ac.in/downloads_mp4/106106126/mod01lec{0}.mp4"
        },
        "download_titles": [
            "Artificial Intelligence: Introduction",
            "Introduction to AI"
            ...
        ]
    }
    ```

- **download_link** : The download link should be abstract with one parameter **{0}** which will increment automatically
- **download_titles** : The titles of the video files

### NOTE:
This application will only download video files serially based on the *download_titles* list,
hence you should add the names properly. There is a one-to-one mapping between the title and download link.

For instance, from the above example the link between the titles and the download URLs are as follows 

Artificial Intelligence: Introduction -> http://npteldownloads.iitm.ac.in/downloads_mp4/106106126/mod01lec0.mp4

Introduction to AI -> http://npteldownloads.iitm.ac.in/downloads_mp4/106106126/mod01lec1.mp4


### NOTE: 
The file names will be based on the download_titles, but will be normalized. The following characters will be replaced by **underscore "_"**

    ? : / , <space>, <tab>

## How to run this application?

The most basic way to run the application is as follows - 

    ```shell
    node nptel.js
    ```
    
OR

    ```shell
    npm start
    ```

    
## License

MIT

## Contact Me

- **Twitter** [@me_sohailalam](https://twitter.com/me_sohailalam)
- **LinkedIn** [Sohail Alam](https://www.linkedin.com/in/alamsohail)
