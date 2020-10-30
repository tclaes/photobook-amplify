import { API, graphqlOperation, Storage } from "aws-amplify";
import { createAlbum as createAlbumMutation } from "@/graphql/mutations";
import { getAlbum as getAlbumQuery } from "@/graphql/queries";
import { listAlbums as listAlbumsQuery } from "@/graphql/queries";
import { createPhoto as createPhotoMutation } from "@/graphql/mutations";
import { uuid } from "uuidv4";
import awsconfig from "@/aws-exports";

export const albumInfo = {
  namespaced: true,
  state: { error: null, albums: null },
  mutations: {
    setAlbums(state, payload) {
      state.albums = payload;
    }
  },
  actions: {
    async createAlbum({ dispatch }, newAlbum) {
      try {
        await API.graphql(
          graphqlOperation(createAlbumMutation, { input: newAlbum })
        );
        dispatch("getAlbumsData");
      } catch (err) {
        console.log(err);
      }
    },
    async getAlbum(_, albumId) {
      try {
        return await API.graphql(
          graphqlOperation(getAlbumQuery, { id: albumId })
        );
      } catch (err) {
        console.log(err);
      }
    },
    async getAlbumsData({ commit }) {
      const albumsData = await API.graphql(graphqlOperation(listAlbumsQuery));
      commit("setAlbums", albumsData.data.listAlbums.items);
    },
    async createPhoto(_, data) {
      const {
        aws_user_files_s3_bucket: region,
        aws_user_files_s3_bucket_region: bucket
      } = awsconfig;
      const { file, type: mimeType, id } = data;
      const extension = file.name.substr(file.name.lastIndexOf(".")+1);
      const photoId = uuid();
      const key = `images/${photoId}.${extension}`;
      const inputData = {
        id: photoId,
        photoAlbumId: id,
        contentType: mimeType,
        fullsize: {
          key,
          region,
          bucket
        }
      }

      // Add to S3 bucket
      try {
        await Storage.put(key, file, {
          level: "protected",
          contentType: mimeType,
          metadata: { albumId: id, photoId }
        });
        await API.graphql(
          graphqlOperation(createPhotoMutation, { input: inputData })
        );
        return Promise.resolve("Success");
      } catch (err) {
        console.log(err);
        return Promise.reject(err);
      }
    }
  },
  getters: {
    albums: state => state.albums
  }
};
